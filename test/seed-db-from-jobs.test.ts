import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
import {
  cleanupTestDb,
  createTestSchema,
  failWritesTo,
  getTestDb,
  setupTestDb,
} from '../src/db/test';

const db = getTestDb();

vi.mock('@/db', () => ({ db }));

const snapshot: AllData = {
  start: '2026-05-04T06:00:00+02:00',
  end: '2026-05-04T07:30:00+02:00',
  procedures: [
    {
      code: 'SEED-1',
      name: 'Seed procedure',
      maxAllowedDays: { regular: 90, fast: 30, veryFast: 14 },
      waitingPeriods: {
        regular: [
          { facility: 'Clinic A', days: 45 },
          { facility: 'Clinic B', days: 60 },
        ],
        fast: null,
        veryFast: null,
      },
    },
  ],
};

const withStart = (start: string): AllData => ({ ...snapshot, start });

describe('seedDBFromJobs', () => {
  let seedDBFromJobs: typeof import('../seed/seed-db-from-jobs').seedDBFromJobs;
  let seedHelpers: typeof import('../seed/seed-helpers').seedHelpers;
  let jobsDir: string;

  const seededJobIds = async () =>
    (await db.select({ id: schema.jobs.gitLabJobId }).from(schema.jobs)).map(
      ({ id }) => id
    );

  beforeAll(async () => {
    ({ seedDBFromJobs } = await import('../seed/seed-db-from-jobs'));
    ({ seedHelpers } = await import('../seed/seed-helpers'));
  });

  beforeEach(async () => {
    await createTestSchema(db);
    jobsDir = await mkdtemp(join(tmpdir(), 'seed-db-from-jobs-'));
    for (const [jobId, day] of [
      ['2001', '2026-05-04'],
      ['2002', '2026-05-05'],
    ]) {
      await writeFile(
        join(jobsDir, `wp-${day}-06-00-00-${jobId}.json`),
        JSON.stringify(withStart(`${day}T06:00:00+02:00`))
      );
    }
    for (const method of ['log', 'info', 'warn', 'error'] as const) {
      vi.spyOn(console, method).mockImplementation(() => {});
    }
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanupTestDb(db);
    await rm(jobsDir, { recursive: true, force: true });
  });

  it('seeds every job file and ignores archives and non-JSON files', async () => {
    await writeFile(join(jobsDir, 'archive-2026-05.json'), 'not json');
    await writeFile(join(jobsDir, 'notes.txt'), 'not json');

    const result = await seedDBFromJobs(false, jobsDir);

    expect(result).toEqual({ seeded: 2, skipped: 0, errors: [] });
    expect((await seededJobIds()).sort()).toEqual(['2001', '2002']);
    await expect(db.$count(schema.waitingPeriods)).resolves.toBe(4);
  });

  it('deletes the existing tables first when asked', async () => {
    await setupTestDb(db);

    const result = await seedDBFromJobs(true, jobsDir);

    expect(result).toEqual({ seeded: 2, skipped: 0, errors: [] });
    expect((await seededJobIds()).sort()).toEqual(['2001', '2002']);
  });

  it('stops before reading files when deleting the tables fails', async () => {
    const error = new Error('delete failure');
    vi.spyOn(seedHelpers, 'deleteTables').mockResolvedValueOnce({
      success: false,
      error,
    });

    const result = await seedDBFromJobs(true, jobsDir);

    expect(result).toEqual({ seeded: 0, skipped: 0, errors: [{ error }] });
    await expect(seededJobIds()).resolves.toEqual([]);
  });

  it('reports an unreadable file and ingests nothing', async () => {
    const fileName = 'wp-2026-05-06-06-00-00-2003.json';
    await writeFile(join(jobsDir, fileName), '{"start":');

    const result = await seedDBFromJobs(false, jobsDir);

    expect(result.seeded).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      error: expect.any(Error),
      meta: { fileName },
    });
    await expect(seededJobIds()).resolves.toEqual([]);
  });

  it('reports a failed ingest with its job ID and stops there', async () => {
    const restore = await failWritesTo(db, 'waiting_periods');

    const result = await seedDBFromJobs(false, jobsDir);
    await restore();

    expect(result.seeded).toBe(0);
    expect(result.errors).toEqual([
      {
        error: expect.objectContaining({
          message: expect.stringContaining('writes to waiting_periods fail'),
        }),
        meta: { jobId: expect.stringMatching(/^200[12]$/) },
      },
    ]);
    await expect(seededJobIds()).resolves.toEqual([]);
  });

  it('skips Jobs already stored when run again over the same files', async () => {
    await seedDBFromJobs(false, jobsDir);

    const result = await seedDBFromJobs(false, jobsDir);

    expect(result).toEqual({ seeded: 0, skipped: 2, errors: [] });
    expect((await seededJobIds()).sort()).toEqual(['2001', '2002']);
  });

  it('skips a file for a day that already has a Job, whatever its job ID', async () => {
    // A rerun later on 2026-05-04
    await writeFile(
      join(jobsDir, 'wp-2026-05-04-09-00-00-2009.json'),
      JSON.stringify(withStart('2026-05-04T09:00:00+02:00'))
    );

    const result = await seedDBFromJobs(false, jobsDir);

    expect(result).toEqual({ seeded: 2, skipped: 1, errors: [] });
    expect((await seededJobIds()).sort()).toEqual(['2001', '2002']);
  });
});
