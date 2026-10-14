import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import * as schema from '../src/db/schema';
import { cleanupTestDb, createTestSchema, getTestDb } from '../src/db/test';
import { snapshotUrl } from '../src/snapshot/source';

const db = getTestDb();

vi.mock('@/db', () => ({ db }));

vi.stubGlobal('fetch', vi.fn());

describe('POST /api/v1/insert-job-data-by-git-lab-id', () => {
  let POST: typeof import('../src/app/api/v1/insert-job-data-by-git-lab-id/route').POST;

  beforeAll(async () => {
    ({ POST } = await import(
      '../src/app/api/v1/insert-job-data-by-git-lab-id/route'
    ));
  });

  beforeEach(async () => {
    vi.resetAllMocks();
    await createTestSchema(db);
  });

  afterEach(async () => {
    await cleanupTestDb(db);
  });

  function post(payload: unknown) {
    return POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    );
  }

  it('returns 422 INVALID_PAYLOAD for a malformed payload', async () => {
    const response = await post({
      success: 'ok',
      gitLabJobId: 'gl-1001',
      date: '2026/04/01',
    });

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

  it('returns 409 JOB_EXISTS when the GitLab job ID is already stored', async () => {
    await storeJob('gl-1001', '2026-03-31T06:00:00Z');

    const response = await post({
      success: 'ok',
      gitLabJobId: 'gl-1001',
      date: '2026-04-01',
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: { code: 'JOB_EXISTS' },
    });
  });

  it('returns 409 JOB_EXISTS when another Job is stored for the date', async () => {
    await storeJob('gl-1000', '2026-04-01T06:00:00Z');

    const response = await post({
      success: 'ok',
      gitLabJobId: 'gl-1001',
      date: '2026-04-01',
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: { code: 'JOB_EXISTS' },
    });
  });

  it('returns 409 JOB_EXISTS when a date with a time part falls on the day of a stored Job', async () => {
    await storeJob('gl-1000', '2026-04-01T06:00:00Z');

    const response = await post({
      success: 'ok',
      gitLabJobId: 'gl-1001',
      date: '2026-04-01T23:30:00.000Z',
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: { code: 'JOB_EXISTS' },
    });
  });

  it('returns 400 with the fetch error and writes nothing when the Snapshot fetch fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 404, statusText: 'Not Found' })
    );

    const response = await post({
      success: 'ok',
      gitLabJobId: 'gl-1001',
      date: '2026-04-01',
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch snapshot for job gl-1001: 404 Not Found',
      },
    });
    await expect(countAllRows()).resolves.toEqual({
      jobs: 0,
      procedures: 0,
      institutions: 0,
      maxAllowedDays: 0,
      waitingPeriods: 0,
    });
  });

  it('writes the Job and its Snapshot rows for a new job ID and date', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(SNAPSHOT))
    );

    const response = await post({
      success: 'ok',
      gitLabJobId: 'gl-1001',
      date: '2026-04-01',
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true });
    expect(fetch).toHaveBeenCalledWith(snapshotUrl('gl-1001'));
    await expect(db.query.jobs.findFirst()).resolves.toMatchObject({
      gitLabJobId: 'gl-1001',
      startDate: '2026-04-01T06:00:00Z',
    });
    await expect(countAllRows()).resolves.toEqual({
      jobs: 1,
      procedures: 1,
      institutions: 1,
      maxAllowedDays: 1,
      waitingPeriods: 1,
    });
  });
});

const SNAPSHOT: AllData = {
  start: '2026-04-01T06:00:00Z',
  end: '2026-04-01T07:00:00Z',
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

async function storeJob(gitLabJobId: string, startDate: string) {
  await db
    .insert(schema.jobs)
    .values({ gitLabJobId, startDate, endDate: startDate });
}

async function countAllRows() {
  return {
    jobs: await db.$count(schema.jobs),
    procedures: await db.$count(schema.procedures),
    institutions: await db.$count(schema.institutions),
    maxAllowedDays: await db.$count(schema.maxAllowedDays),
    waitingPeriods: await db.$count(schema.waitingPeriods),
  };
}
