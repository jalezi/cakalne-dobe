import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import { handleBackfillRequest } from '../src/app/api/v1/insert-job-data-by-git-lab-id/handle-backfill-request';
import * as schema from '../src/db/schema';
import {
  cleanupTestDb,
  createTestSchema,
  failWritesTo,
  getTestDb,
} from '../src/db/test';
import { createInMemoryGitLabSource } from '../src/snapshot/source';

const db = getTestDb();

const SNAPSHOT: AllData = {
  start: '2026-04-01T06:00:00+02:00',
  end: '2026-04-01T07:00:00+02:00',
  procedures: [
    {
      code: 'PROC-1',
      name: 'Procedure 1',
      maxAllowedDays: { regular: 30, fast: 10, veryFast: 5 },
      waitingPeriods: {
        regular: [{ facility: 'Facility 1', days: 20 }],
        fast: [{ facility: 'Facility 1', days: 8 }],
        veryFast: [{ facility: 'Facility 1', days: 3 }],
      },
    },
  ],
};

let source: ReturnType<typeof createInMemoryGitLabSource>;

beforeEach(async () => {
  source = createInMemoryGitLabSource({
    jobs: [],
    snapshots: { 'gl-1001': SNAPSHOT },
  });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
  await createTestSchema(db);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await cleanupTestDb(db);
});

describe('POST /api/v1/insert-job-data-by-git-lab-id with INGEST_SECRET set', () => {
  it.each([
    ['no header', {}],
    ['a wrong token', { authorization: 'Bearer wrong' }],
    ['a non-Bearer scheme', { authorization: 'Basic s3cret' }],
  ])(
    'returns 401 for %s without parsing the body, reading the DB or calling GitLab',
    async (_case, headers) => {
      vi.stubEnv('INGEST_SECRET', 's3cret');
      const findFirst = vi.spyOn(db.query.jobs, 'findFirst');

      // Invalid JSON: a 401 (not a 500) shows request.json() never ran
      const response = await handleBackfillRequest(
        new Request('http://localhost', {
          method: 'POST',
          body: 'not json',
          headers,
        }),
        { db, source }
      );

      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({
        success: false,
        error: { code: 'UNAUTHORIZED' },
      });
      expect(findFirst).not.toHaveBeenCalled();
      expect(source.fetched).toEqual([]);
    }
  );
});

describe.each([
  ['unset', undefined, {}],
  ['set', 's3cret', { authorization: 'Bearer s3cret' }],
])(
  'POST /api/v1/insert-job-data-by-git-lab-id with INGEST_SECRET %s',
  (_case, secret, headers) => {
    beforeEach(() => {
      vi.stubEnv('INGEST_SECRET', secret);
    });

    function post(payload: unknown) {
      return handleBackfillRequest(
        new Request('http://localhost', {
          method: 'POST',
          body: JSON.stringify(payload),
          headers,
        }),
        { db, source }
      );
    }

    it('returns 422 INVALID_PAYLOAD for a payload without a GitLab job ID', async () => {
      const response = await post({ success: 'ok' });

      expect(response.status).toBe(422);
      expect(await response.json()).toMatchObject({
        error: { code: 'INVALID_PAYLOAD' },
      });
    });

    it('returns 422 WEBHOOK_ERROR with the reported message', async () => {
      const response = await post({
        success: 'error',
        error: 'GitLab pipeline failed',
      });

      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({
        success: false,
        error: { code: 'WEBHOOK_ERROR', message: 'GitLab pipeline failed' },
      });
    });

    it.each([
      [
        'more than 10 keys',
        Object.fromEntries(
          Array.from({ length: 11 }, (_, i) => [`key${i}`, 'x'])
        ),
      ],
      ['a value over 200 characters', { note: 'x'.repeat(201) }],
      ['a non-string value', { attempt: 2 }],
      ['a non-object', 'gap check'],
    ])(
      'returns 422 INVALID_PAYLOAD for a meta with %s, and downloads nothing',
      async (_case, meta) => {
        const response = await post({
          success: 'ok',
          gitLabJobId: 'gl-1001',
          meta,
        });

        expect(response.status).toBe(422);
        expect(await response.json()).toMatchObject({
          error: { code: 'INVALID_PAYLOAD' },
        });
        expect(source.fetched).toEqual([]);
      }
    );

    it('accepts the largest meta allowed', async () => {
      const meta = Object.fromEntries(
        Array.from({ length: 10 }, (_, i) => [`key${i}`, 'x'.repeat(200)])
      );

      const response = await post({
        success: 'ok',
        gitLabJobId: 'gl-1001',
        meta,
      });

      expect(response.status).toBe(200);
    });

    it('writes the Job and returns its day and the inserted counts', async () => {
      const response = await post({ success: 'ok', gitLabJobId: 'gl-1001' });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        success: true,
        data: {
          job: {
            id: expect.any(String),
            gitLabJobId: 'gl-1001',
            day: '2026-04-01',
          },
          inserted: {
            procedures: 1,
            institutions: 1,
            maxAllowedDays: 1,
            waitingPeriods: 1,
          },
        },
      });
      expect(source.fetched).toEqual(['gl-1001']);
      await expect(countAllRows()).resolves.toEqual({
        jobs: 1,
        procedures: 1,
        institutions: 1,
        maxAllowedDays: 1,
        waitingPeriods: 1,
      });
    });

    it('logs meta with the request and echoes it back unchanged', async () => {
      const meta = { source: 'gap check', issue: '#201' };
      const consoleInfo = vi.spyOn(console, 'info');

      const response = await post({
        success: 'ok',
        gitLabJobId: 'gl-1001',
        meta,
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ success: true, meta });
      expect(consoleInfo).toHaveBeenCalledWith('Backfill request', {
        gitLabJobId: 'gl-1001',
        meta,
      });
    });

    it('accepts an old body that still sends date, and ignores the date', async () => {
      // The date names another day than the Snapshot, and is not even valid
      const response = await post({
        success: 'ok',
        gitLabJobId: 'gl-1001',
        date: '2026/05/09',
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        data: { job: { day: '2026-04-01' } },
      });
    });

    it.each([
      ['the GitLab job ID is stored', 'gl-1001', '2026-03-31T06:00:00+02:00'],
      [
        'another Job is stored for the day',
        'gl-1000',
        '2026-04-01T05:00:00+02:00',
      ],
    ])(
      'returns 409 JOB_EXISTS and echoes meta when %s',
      async (_case, storedId, storedStart) => {
        await db.insert(schema.jobs).values({
          gitLabJobId: storedId,
          startDate: storedStart,
          endDate: storedStart,
        });
        const meta = { note: 'retry' };

        const response = await post({
          success: 'ok',
          gitLabJobId: 'gl-1001',
          meta,
        });

        expect(response.status).toBe(409);
        expect(await response.json()).toMatchObject({
          success: false,
          error: { code: 'JOB_EXISTS' },
          meta,
        });
        await expect(db.$count(schema.jobs)).resolves.toBe(1);
      }
    );

    it('returns 400 with the fetch error and writes nothing when the Snapshot fetch fails', async () => {
      const response = await post({ success: 'ok', gitLabJobId: 'gl-404' });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'No in-memory snapshot found for job gl-404',
        },
      });
      await expect(db.$count(schema.jobs)).resolves.toBe(0);
    });

    it('returns 400 TRANSFORM_FAILED when the Snapshot cannot be transformed', async () => {
      source = createInMemoryGitLabSource({
        jobs: [],
        snapshots: { 'gl-1001': { ...SNAPSHOT, start: 'not a date' } },
      });

      const response = await post({ success: 'ok', gitLabJobId: 'gl-1001' });

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        success: false,
        error: { code: 'TRANSFORM_FAILED' },
      });
    });

    it('returns 500 WRITE_FAILED and writes nothing when a write fails', async () => {
      const restore = await failWritesTo(db, 'waiting_periods');

      const response = await post({ success: 'ok', gitLabJobId: 'gl-1001' });
      await restore();

      expect(response.status).toBe(500);
      expect(await response.json()).toMatchObject({
        success: false,
        error: { code: 'WRITE_FAILED' },
      });
      await expect(db.$count(schema.jobs)).resolves.toBe(0);
    });
  }
);

async function countAllRows() {
  return {
    jobs: await db.$count(schema.jobs),
    procedures: await db.$count(schema.procedures),
    institutions: await db.$count(schema.institutions),
    maxAllowedDays: await db.$count(schema.maxAllowedDays),
    waitingPeriods: await db.$count(schema.waitingPeriods),
  };
}
