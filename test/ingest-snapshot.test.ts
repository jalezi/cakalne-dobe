import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import * as schema from '../src/db/schema';
import {
  cleanupTestDb,
  createTestSchema,
  failWritesTo,
  getTestDb,
} from '../src/db/test';
import { ingestSnapshot } from '../src/snapshot';

const db = getTestDb();

type ProcedureFixture = {
  code: string;
  name: string;
  institutions: string[];
};

function buildSnapshot(procedures: ProcedureFixture[]): AllData {
  return {
    start: '2026-10-01T00:00:00Z',
    end: '2026-10-01T01:00:00Z',
    procedures: procedures.map(({ code, name, institutions }) => ({
      code,
      name,
      maxAllowedDays: { regular: 90, fast: 30, veryFast: 14 },
      waitingPeriods: {
        regular: institutions.map((facility) => ({ facility, days: 60 })),
        fast: institutions.map((facility) => ({ facility, days: 20 })),
        veryFast: null,
      },
    })),
  };
}

// 3 Procedures, 2 Institutions, 3 Max Allowed Days, 4 Waiting Periods
const FIRST_SNAPSHOT = buildSnapshot([
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
const SECOND_SNAPSHOT = buildSnapshot([
  {
    code: '1001',
    name: 'Procedure 1',
    institutions: ['Institution A', 'Institution C', 'Institution D'],
  },
  { code: '1002', name: 'Procedure 2', institutions: ['Institution C'] },
  { code: '1004', name: 'Procedure 4', institutions: ['Institution D'] },
]);

const NO_ROWS = {
  jobs: 0,
  procedures: 0,
  institutions: 0,
  maxAllowedDays: 0,
  waitingPeriods: 0,
};

describe('ingestSnapshot', () => {
  beforeEach(async () => {
    await createTestSchema(db);
  });

  afterEach(async () => {
    await cleanupTestDb(db);
  });

  it('stores the Job and all of its rows, and reports what it inserted', async () => {
    const result = await ingestSnapshot(db, 'gitlab-job-1', FIRST_SNAPSHOT);

    expect(result).toEqual({
      success: true,
      data: {
        job: { id: expect.any(String), gitLabJobId: 'gitlab-job-1' },
        inserted: {
          procedures: 3,
          institutions: 2,
          maxAllowedDays: 3,
          waitingPeriods: 4,
        },
      },
    });
    await expect(countAllRows()).resolves.toEqual({
      jobs: 1,
      procedures: 3,
      institutions: 2,
      maxAllowedDays: 3,
      waitingPeriods: 4,
    });
    await expect(db.query.jobs.findFirst()).resolves.toMatchObject({
      gitLabJobId: 'gitlab-job-1',
      startDate: '2026-10-01T00:00:00Z',
      endDate: '2026-10-01T01:00:00Z',
    });
  });

  it('reuses Procedures and Institutions stored by an earlier Job', async () => {
    await ingestSnapshot(db, 'gitlab-job-1', FIRST_SNAPSHOT);

    const result = await ingestSnapshot(db, 'gitlab-job-2', SECOND_SNAPSHOT);

    expect(result.success && result.data.inserted).toEqual({
      procedures: 1,
      institutions: 2,
      maxAllowedDays: 3,
      waitingPeriods: 5,
    });
    await expect(countAllRows()).resolves.toEqual({
      jobs: 2,
      procedures: 4,
      institutions: 4,
      maxAllowedDays: 6,
      waitingPeriods: 9,
    });
  });

  it('returns TRANSFORM_FAILED and writes nothing when the Snapshot cannot be transformed', async () => {
    const badSnapshot = buildSnapshot([
      { code: '1001', name: 'Procedure 1', institutions: [] },
    ]);
    badSnapshot.procedures[0].waitingPeriods.regular = [
      { facility: 123 as unknown as string, days: 5 },
    ];

    const result = await ingestSnapshot(db, 'gitlab-job-1', badSnapshot);

    expect(result).toMatchObject({
      success: false,
      error: { code: 'TRANSFORM_FAILED' },
    });
    await expect(countAllRows()).resolves.toEqual(NO_ROWS);
  });

  it('returns TRANSFORM_FAILED with the cause instead of throwing when the transformer throws a non-Zod error', async () => {
    const badSnapshot = buildSnapshot([
      { code: '1001', name: 'Procedure 1', institutions: [] },
    ]);
    // Object.entries(null) throws a TypeError, not a ZodError
    badSnapshot.procedures[0].waitingPeriods =
      null as unknown as AllData['procedures'][number]['waitingPeriods'];

    const result = await ingestSnapshot(db, 'gitlab-job-1', badSnapshot);

    expect(result).toEqual({
      success: false,
      error: {
        code: 'TRANSFORM_FAILED',
        message:
          'Failed to prepare snapshot insert payload for job gitlab-job-1',
      },
      meta: { cause: expect.stringContaining('null') },
    });
    await expect(countAllRows()).resolves.toEqual(NO_ROWS);
  });

  it('returns JOB_EXISTS and changes no rows when the Job is already stored', async () => {
    await db
      .insert(schema.procedures)
      .values({ code: '1001', name: 'Procedure-1' });
    await ingestSnapshot(
      db,
      'gitlab-job-1',
      buildSnapshot([
        { code: '1002', name: 'Procedure 2', institutions: ['Institution A'] },
      ])
    );
    const rowsBefore = await countAllRows();

    // Same GitLab Job, with a rename and a new Procedure and Institution
    const result = await ingestSnapshot(
      db,
      'gitlab-job-1',
      buildSnapshot([
        { code: '1001', name: 'Procedure 1', institutions: ['Institution E'] },
        { code: '1005', name: 'Procedure 5', institutions: ['Institution E'] },
      ])
    );

    expect(result).toEqual({
      success: false,
      error: {
        code: 'JOB_EXISTS',
        message:
          'Job with GitLab job ID gitlab-job-1 already exists in the database',
      },
    });
    await expect(countAllRows()).resolves.toEqual(rowsBefore);
    await expect(
      db.query.procedures.findFirst({
        where: (procedures, { eq }) => eq(procedures.code, '1001'),
      })
    ).resolves.toMatchObject({ name: 'Procedure-1' });
  });

  it('returns WRITE_FAILED with the database reason and leaves no rows when a write fails', async () => {
    const restore = await failWritesTo(db, 'waiting_periods');

    const result = await ingestSnapshot(db, 'gitlab-job-1', FIRST_SNAPSHOT);
    await restore();

    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'WRITE_FAILED',
        message: expect.stringMatching(
          /^Failed query: insert into "waiting_periods"[\s\S]*\ncause: [\s\S]*writes to waiting_periods fail/
        ),
      },
    });
    await expect(countAllRows()).resolves.toEqual(NO_ROWS);

    await expect(
      ingestSnapshot(db, 'gitlab-job-1', FIRST_SNAPSHOT)
    ).resolves.toMatchObject({ success: true });
  });

  it('returns WRITE_FAILED when one Snapshot lists a Procedure code twice', async () => {
    const result = await ingestSnapshot(
      db,
      'gitlab-job-1',
      buildSnapshot([
        { code: '1001', name: 'Procedure 1', institutions: [] },
        { code: '1001', name: 'Procedure 1', institutions: [] },
      ])
    );

    expect(result).toMatchObject({
      success: false,
      error: { code: 'WRITE_FAILED' },
    });
    await expect(countAllRows()).resolves.toEqual(NO_ROWS);
  });
});

async function countAllRows() {
  return {
    jobs: await db.$count(schema.jobs),
    procedures: await db.$count(schema.procedures),
    institutions: await db.$count(schema.institutions),
    maxAllowedDays: await db.$count(schema.maxAllowedDays),
    waitingPeriods: await db.$count(schema.waitingPeriods),
  };
}
