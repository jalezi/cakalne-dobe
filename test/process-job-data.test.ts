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
import type { SnapshotInsertPayload } from '../src/types';

const db = getTestDb();

vi.mock('@/db', () => ({ db }));

type ProcedureFixture = {
  code: string;
  name: string;
  institutions: string[];
};

function buildSnapshot(gitLabJobId: string, procedures: ProcedureFixture[]) {
  const jobData: schema.InsertJob = {
    gitLabJobId,
    startDate: '2026-10-01T00:00:00Z',
    endDate: '2026-10-01T01:00:00Z',
  };
  const payload: SnapshotInsertPayload = {
    procedures: [],
    institutions: new Map(),
    maxAllowedDays: [],
    waitingPeriods: new Map(),
  };

  for (const { code, name, institutions } of procedures) {
    payload.procedures.push({ code, name });
    payload.maxAllowedDays.push({
      regular: 90,
      fast: 30,
      veryFast: 14,
      jobId: gitLabJobId,
      procedureCode: code,
    });

    for (const institutionName of institutions) {
      payload.institutions.set(institutionName, { name: institutionName });
      payload.waitingPeriods.set(`${institutionName}-${code}`, {
        regular: 60,
        fast: 20,
        veryFast: null,
        jobId: gitLabJobId,
        procedureCode: code,
        institutionName,
      });
    }
  }

  return { jobData, payload };
}

// 3 Procedures, 2 Institutions, 3 Max Allowed Days, 4 Waiting Periods
const firstSnapshot = () =>
  buildSnapshot('gitlab-job-1', [
    {
      code: '1001',
      name: 'Procedure 1',
      institutions: ['Institution A', 'Institution B'],
    },
    { code: '1002', name: 'Procedure 2', institutions: ['Institution A'] },
    { code: '1003', name: 'Procedure 3', institutions: ['Institution B'] },
  ]);

// Shares Procedures 1001 and 1002 and Institution A with the first Snapshot
// 3 Procedures (1 new), 3 Institutions (2 new), 3 Max Allowed Days, 5 Waiting Periods
const secondSnapshot = () =>
  buildSnapshot('gitlab-job-2', [
    {
      code: '1001',
      name: 'Procedure 1',
      institutions: ['Institution A', 'Institution C', 'Institution D'],
    },
    { code: '1002', name: 'Procedure 2', institutions: ['Institution C'] },
    { code: '1004', name: 'Procedure 4', institutions: ['Institution D'] },
  ]);

describe('processJobData', () => {
  let processJobData: typeof import('../src/app/api/v1/insert-new-job-data/db-operations').processJobData;

  beforeAll(async () => {
    ({ processJobData } = await import(
      '../src/app/api/v1/insert-new-job-data/db-operations'
    ));
  });

  beforeEach(async () => {
    await createTestSchema(db);
  });

  afterEach(async () => {
    await cleanupTestDb(db);
  });

  it('writes the Job and all of its rows, and reports what it wrote', async () => {
    const { jobData, payload } = firstSnapshot();

    const result = await processJobData(jobData, payload);

    await expect(countAllRows()).resolves.toEqual({
      jobs: 1,
      procedures: 3,
      institutions: 2,
      maxAllowedDays: 3,
      waitingPeriods: 4,
    });
    expect(result.data.job).toEqual({
      id: expect.any(String),
      gitLabJobId: 'gitlab-job-1',
    });
    expect(result.meta.length).toEqual({
      total: { total: 13, inserted: 13 },
      job: { total: 1, inserted: 1 },
      procedures: { total: 3, inserted: 3, existing: 0 },
      institutions: { total: 2, inserted: 2, existing: 0 },
      maxAllowedDays: { total: 3, inserted: 3 },
      waitingPeriods: { total: 4, inserted: 4 },
    });
  });

  it('reuses Procedures and Institutions already written by an earlier Job', async () => {
    const first = firstSnapshot();
    await processJobData(first.jobData, first.payload);
    const { jobData, payload } = secondSnapshot();

    const result = await processJobData(jobData, payload);

    await expect(countAllRows()).resolves.toEqual({
      jobs: 2,
      procedures: 4,
      institutions: 4,
      maxAllowedDays: 6,
      waitingPeriods: 9,
    });
    expect(result.meta.length).toEqual({
      total: { total: 15, inserted: 12 },
      job: { total: 1, inserted: 1 },
      procedures: { total: 3, inserted: 1, existing: 2 },
      institutions: { total: 3, inserted: 2, existing: 1 },
      maxAllowedDays: { total: 3, inserted: 3 },
      waitingPeriods: { total: 5, inserted: 5 },
    });
  });

  it('fails and writes nothing when the Job is already in the database', async () => {
    const first = firstSnapshot();
    await processJobData(first.jobData, first.payload);
    const rowsBefore = await countAllRows();
    // Same GitLab job, but with a Procedure and an Institution not yet written
    const { jobData, payload } = buildSnapshot('gitlab-job-1', [
      { code: '1005', name: 'Procedure 5', institutions: ['Institution E'] },
    ]);

    await expect(processJobData(jobData, payload)).rejects.toThrow(
      'Job with GitLab job ID gitlab-job-1 already exists in the database'
    );

    await expect(countAllRows()).resolves.toEqual(rowsBefore);
  });

  // Each case breaks one insert step with a row the database rejects
  it.each<{
    step: string;
    breakSnapshot: (payload: SnapshotInsertPayload) => void;
    cause: string;
  }>([
    {
      step: 'Procedures',
      breakSnapshot: (payload) => {
        payload.procedures.push({ code: '9999', name: 'Procedure 1' });
      },
      cause: 'UNIQUE constraint failed: procedures.name',
    },
    {
      step: 'Institutions',
      breakSnapshot: (payload) => {
        payload.institutions.set('Institution A (again)', {
          name: 'Institution A',
        });
      },
      cause: 'UNIQUE constraint failed: institutions.name',
    },
    {
      step: 'Max Allowed Days',
      breakSnapshot: (payload) => {
        payload.maxAllowedDays.push({ ...payload.maxAllowedDays[0] });
      },
      cause: 'UNIQUE constraint failed: max_allowed_days.job_id',
    },
    {
      step: 'Waiting Periods',
      breakSnapshot: (payload) => {
        const [waitingPeriod] = payload.waitingPeriods.values();
        payload.waitingPeriods.set('again', { ...waitingPeriod });
      },
      cause: 'UNIQUE constraint failed: waiting_periods.job_id',
    },
  ])(
    'writes nothing and reports the cause when the $step insert fails',
    async ({ breakSnapshot, cause }) => {
      const { jobData, payload } = firstSnapshot();
      breakSnapshot(payload);

      await expect(processJobData(jobData, payload)).rejects.toMatchObject({
        cause: expect.objectContaining({
          message: expect.stringContaining(cause),
        }),
      });

      await expect(countAllRows()).resolves.toEqual({
        jobs: 0,
        procedures: 0,
        institutions: 0,
        maxAllowedDays: 0,
        waitingPeriods: 0,
      });
    }
  );
});

async function countAllRows() {
  return {
    jobs: await countRows(schema.jobs),
    procedures: await countRows(schema.procedures),
    institutions: await countRows(schema.institutions),
    maxAllowedDays: await countRows(schema.maxAllowedDays),
    waitingPeriods: await countRows(schema.waitingPeriods),
  };
}

async function countRows(
  table:
    | typeof schema.jobs
    | typeof schema.procedures
    | typeof schema.institutions
    | typeof schema.maxAllowedDays
    | typeof schema.waitingPeriods
) {
  const result = await db.select({ count: sql<number>`count(*)` }).from(table);
  return result[0]?.count ?? 0;
}
