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

const snapshotData = {
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

describe('ingestSnapshot', () => {
  let ingestSnapshot: typeof import('../seed/ingest-snapshot').ingestSnapshot;
  let jobsHelpers: typeof import('../seed/seed-helpers/seed-jobs');
  let proceduresHelpers: typeof import('../seed/seed-helpers/seed-procedures');
  let maxAllowedDaysHelpers: typeof import('../seed/seed-helpers/seed-max-allowed-days');
  let institutionsHelpers: typeof import('../seed/seed-helpers/seed-institutions');
  let waitingTimesHelpers: typeof import('../seed/seed-helpers/seed-waiting-times');

  beforeAll(async () => {
    ({ ingestSnapshot } = await import('../seed/ingest-snapshot'));
    jobsHelpers = await import('../seed/seed-helpers/seed-jobs');
    proceduresHelpers = await import('../seed/seed-helpers/seed-procedures');
    maxAllowedDaysHelpers = await import(
      '../seed/seed-helpers/seed-max-allowed-days'
    );
    institutionsHelpers = await import(
      '../seed/seed-helpers/seed-institutions'
    );
    waitingTimesHelpers = await import(
      '../seed/seed-helpers/seed-waiting-times'
    );
  });

  beforeEach(async () => {
    await createTestSchema(db);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanupTestDb(db);
  });

  it('writes all snapshot rows when ingestion succeeds', async () => {
    await ingestSnapshot(snapshotData, 'gitlab-job-1', { db });

    await expect(countRows(db, schema.jobs)).resolves.toBe(1);
    await expect(countRows(db, schema.procedures)).resolves.toBe(1);
    await expect(countRows(db, schema.maxAllowedDays)).resolves.toBe(1);
    await expect(countRows(db, schema.institutions)).resolves.toBe(1);
    await expect(countRows(db, schema.waitingPeriods)).resolves.toBe(1);
  });

  // Steps 1–2 catch DB errors and return them; the pipeline rethrows the first.
  // Steps 3–5 throw directly.
  it.each([
    {
      step: 1,
      helper: 'insertJobs',
      fail: () =>
        vi.spyOn(jobsHelpers, 'insertJobs').mockResolvedValueOnce({
          errors: [{ error: new Error('step 1 failure') }],
          existing: [],
          unique: [],
        }),
    },
    {
      step: 2,
      helper: 'insertProcedures',
      fail: () =>
        vi.spyOn(proceduresHelpers, 'insertProcedures').mockResolvedValueOnce({
          errors: [{ error: new Error('step 2 failure') }],
          existing: [],
          unique: [],
          renamed: [],
        }),
    },
    {
      step: 3,
      helper: 'insertMaxAllowedDays',
      fail: () =>
        vi
          .spyOn(maxAllowedDaysHelpers, 'insertMaxAllowedDays')
          .mockRejectedValueOnce(new Error('step 3 failure')),
    },
    {
      step: 4,
      helper: 'insertInstitutions',
      fail: () =>
        vi
          .spyOn(institutionsHelpers, 'insertInstitutions')
          .mockRejectedValueOnce(new Error('step 4 failure')),
    },
    {
      step: 5,
      helper: 'insertWaitingTimes',
      fail: () =>
        vi
          .spyOn(waitingTimesHelpers, 'insertWaitingTimes')
          .mockRejectedValueOnce(new Error('step 5 failure')),
    },
  ])('rolls back all writes when step $step ($helper) fails', async ({
    step,
    fail,
  }) => {
    fail();

    await expect(
      ingestSnapshot(snapshotData, 'gitlab-job-1', { db })
    ).rejects.toThrow(`step ${step} failure`);

    await expect(countRows(db, schema.jobs)).resolves.toBe(0);
    await expect(countRows(db, schema.procedures)).resolves.toBe(0);
    await expect(countRows(db, schema.maxAllowedDays)).resolves.toBe(0);
    await expect(countRows(db, schema.institutions)).resolves.toBe(0);
    await expect(countRows(db, schema.waitingPeriods)).resolves.toBe(0);
  });
});

type CountableTable =
  | typeof schema.jobs
  | typeof schema.procedures
  | typeof schema.maxAllowedDays
  | typeof schema.institutions
  | typeof schema.waitingPeriods;

async function countRows(
  db: ReturnType<typeof getTestDb>,
  table: CountableTable
) {
  const result = await db.select({ count: sql<number>`count(*)` }).from(table);
  return result[0]?.count ?? 0;
}
