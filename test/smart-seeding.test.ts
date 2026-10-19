import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import * as schema from '../src/db/schema';
import { cleanupTestDb, createTestSchema, getTestDb } from '../src/db/test';

const db = getTestDb();

vi.mock('@/db', () => ({ db }));

const jobData = {
  start: '2026-04-01T00:00:00Z',
  end: '2026-04-01T01:00:00Z',
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

const FILE_1001 = 'wp-2026-04-01-00-00-00-1001.json';
const FILE_1002 = 'wp-2026-04-02-00-00-00-1002.json';

describe('seedMissingJobsOnly', () => {
  let seedMissingJobsOnly: typeof import('../seed/seed-helpers/smart-seeding').seedMissingJobsOnly;
  let waitingTimesHelpers: typeof import('../seed/seed-helpers/seed-waiting-times');
  let jobsDir: string;

  beforeAll(async () => {
    ({ seedMissingJobsOnly } = await import(
      '../seed/seed-helpers/smart-seeding'
    ));
    waitingTimesHelpers = await import(
      '../seed/seed-helpers/seed-waiting-times'
    );
  });

  beforeEach(async () => {
    await createTestSchema(db);
    jobsDir = await mkdtemp(join(tmpdir(), 'smart-seeding-'));
    await writeFile(join(jobsDir, FILE_1001), JSON.stringify(jobData));
    await writeFile(join(jobsDir, FILE_1002), JSON.stringify(jobData));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanupTestDb(db);
    await rm(jobsDir, { recursive: true, force: true });
  });

  it('returns an empty result when there are no files', async () => {
    await expect(seedMissingJobsOnly([], jobsDir)).resolves.toEqual({
      seeded: 0,
      skipped: 0,
      errors: [],
    });
  });

  it('leaves no rows for a job whose write fails partway, and seeds it on the next call', async () => {
    // Steps 1–4 have written by the time step 5 (waiting periods) fails
    vi.spyOn(waitingTimesHelpers, 'insertWaitingTimes').mockRejectedValueOnce(
      new Error('step 5 failure')
    );

    const failed = await seedMissingJobsOnly([FILE_1001], jobsDir);

    expect(failed.seeded).toBe(0);
    expect(failed.skipped).toBe(0);
    expect(failed.errors).toHaveLength(1);
    expect(failed.errors[0].error.message).toBe('step 5 failure');
    expect(failed.errors[0].meta).toEqual({ jobId: '1001' });
    await expect(countAllRows()).resolves.toEqual([0, 0, 0, 0, 0]);

    const retried = await seedMissingJobsOnly([FILE_1001], jobsDir);

    expect(retried).toEqual({ seeded: 1, skipped: 0, errors: [] });
    await expect(countAllRows()).resolves.toEqual([1, 1, 1, 1, 1]);
  });

  it('records a failed job with its job ID and moves on to the next job', async () => {
    vi.spyOn(waitingTimesHelpers, 'insertWaitingTimes').mockRejectedValueOnce(
      new Error('step 5 failure')
    );

    const result = await seedMissingJobsOnly([FILE_1001, FILE_1002], jobsDir);

    expect(result.seeded).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].meta).toEqual({ jobId: '1001' });
    const seededJobs = await db
      .select({ gitLabJobId: schema.jobs.gitLabJobId })
      .from(schema.jobs);
    expect(seededJobs).toEqual([{ gitLabJobId: '1002' }]);
  });

  it('skips jobs already in the database and counts them', async () => {
    await seedMissingJobsOnly([FILE_1001], jobsDir);

    const result = await seedMissingJobsOnly([FILE_1001, FILE_1002], jobsDir);

    expect(result).toEqual({ seeded: 1, skipped: 1, errors: [] });
  });

  it('reports files that fail to load and seeds the rest', async () => {
    await writeFile(
      join(jobsDir, 'wp-2026-04-03-00-00-00-1003.json'),
      '{"broken":'
    );

    const result = await seedMissingJobsOnly(
      ['wp-2026-04-03-00-00-00-1003.json', FILE_1001],
      jobsDir
    );

    expect(result.seeded).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].meta).toEqual({
      fileName: 'wp-2026-04-03-00-00-00-1003.json',
      jobId: '1003',
    });
  });
});

function countAllRows() {
  return Promise.all(
    [
      schema.jobs,
      schema.procedures,
      schema.maxAllowedDays,
      schema.institutions,
      schema.waitingPeriods,
    ].map(async (table) => {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(table);
      return result[0]?.count ?? 0;
    })
  );
}
