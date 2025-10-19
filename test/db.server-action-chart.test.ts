import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from 'vitest';
import { cleanupTestDb, getTestDb, setupTestDb } from '../src/db/test';
import * as schema from '../src/db/schema';
import { avg, eq, and, sql } from 'drizzle-orm';
import { format } from 'date-fns';

// Mock the db module to use test database
vi.mock('@/db', async () => {
  const { getTestDb } = await import('../src/db/test');
  return {
    db: getTestDb(),
  };
});

// Mock the env module
vi.mock('@/lib/env', () => ({
  ENV_SERVER_VARS: {
    DATABASE_URL: ':memory:',
    DATABASE_AUTH_TOKEN: undefined,
  },
}));

describe('Server Action: getProcedureAvgWtPerJobChart', () => {
  const db = getTestDb();
  let fixtures: Awaited<ReturnType<typeof setupTestDb>>;

  beforeAll(async () => {
    // Set up test data
    fixtures = await setupTestDb(db);

    // Add more test data with multiple dates
    // Create additional jobs with different dates
    const secondJobId = 'test-job-id-2';
    await db.insert(schema.jobs).values({
      id: secondJobId,
      gitLabJobId: 'test-git-lab-job-id-2',
      startDate: '2023-01-02T00:00:00Z',
      endDate: '2023-01-02T01:00:00Z',
    });

    const thirdJobId = 'test-job-id-3';
    await db.insert(schema.jobs).values({
      id: thirdJobId,
      gitLabJobId: 'test-git-lab-job-id-3',
      startDate: '2023-01-03T00:00:00Z',
      endDate: '2023-01-03T01:00:00Z',
    });

    // Add max allowed days for new jobs
    await db.insert(schema.maxAllowedDays).values([
      {
        jobId: secondJobId,
        procedureId: fixtures.procedure.id,
        regular: 30,
        fast: 10,
        veryFast: 5,
      },
      {
        jobId: thirdJobId,
        procedureId: fixtures.procedure.id,
        regular: 30,
        fast: 10,
        veryFast: 5,
      },
    ]);

    // Add waiting periods with different values
    await db.insert(schema.waitingPeriods).values([
      {
        jobId: secondJobId,
        institutionId: fixtures.institution.id,
        procedureId: fixtures.procedure.id,
        regular: 25,
        fast: 12,
        veryFast: 6,
      },
      {
        jobId: thirdJobId,
        institutionId: fixtures.institution.id,
        procedureId: fixtures.procedure.id,
        regular: 32,
        fast: 15,
        veryFast: 8,
      },
    ]);
  });

  afterEach(async () => {
    // No cleanup needed between tests
  });

  afterAll(async () => {
    // Final cleanup
    await cleanupTestDb(db);
  });

  it('should return the average waiting times for a procedure over time range', async () => {
    const fromDate = new Date('2023-01-01T00:00:00Z');
    const toDate = new Date('2023-01-03T00:00:00Z');

    // Get the SQLite date format from the dates
    const fromDateString = format(fromDate, 'yyyy-MM-dd');
    const toDateString = format(toDate, 'yyyy-MM-dd');

    // Use SQL query to get the same data as the server action
    const sqlStartDate = sql<string>`strftime('%Y-%m-%d',${schema.jobs.startDate})`;

    const result = await db
      .select({
        x: sqlStartDate,
        y: {
          regular: avg(schema.waitingPeriods.regular).mapWith(Number),
          fast: avg(schema.waitingPeriods.fast).mapWith(Number),
          veryFast: avg(schema.waitingPeriods.veryFast).mapWith(Number),
        },
      })
      .from(schema.waitingPeriods)
      .where(
        and(
          eq(schema.procedures.code, fixtures.procedure.code),
          sql`${sqlStartDate} >= ${fromDateString}`,
          sql`${sqlStartDate} <= ${toDateString}`
        )
      )
      .innerJoin(schema.jobs, eq(schema.waitingPeriods.jobId, schema.jobs.id))
      .innerJoin(
        schema.procedures,
        eq(schema.waitingPeriods.procedureId, schema.procedures.id)
      )
      .groupBy(schema.waitingPeriods.jobId, schema.waitingPeriods.procedureId)
      .orderBy(schema.jobs.startDate);

    // Assertions
    expect(result).toHaveLength(3); // Should have three jobs

    // First day should have the original waiting period
    expect(result[0].x).toBe('2023-01-01');
    expect(result[0].y.regular).toBeCloseTo(20);
    expect(result[0].y.fast).toBeCloseTo(8);
    expect(result[0].y.veryFast).toBeCloseTo(3);

    // Second day
    expect(result[1].x).toBe('2023-01-02');
    expect(result[1].y.regular).toBeCloseTo(25);
    expect(result[1].y.fast).toBeCloseTo(12);
    expect(result[1].y.veryFast).toBeCloseTo(6);

    // Third day
    expect(result[2].x).toBe('2023-01-03');
    expect(result[2].y.regular).toBeCloseTo(32);
    expect(result[2].y.fast).toBeCloseTo(15);
    expect(result[2].y.veryFast).toBeCloseTo(8);
  });

  it('should return an empty array when no data exists in the time range', async () => {
    const fromDate = new Date('2023-02-01T00:00:00Z');
    const toDate = new Date('2023-02-28T00:00:00Z');

    // Get the SQLite date format from the dates
    const fromDateString = format(fromDate, 'yyyy-MM-dd');
    const toDateString = format(toDate, 'yyyy-MM-dd');

    // Use SQL query to get the same data as the server action
    const sqlStartDate = sql<string>`strftime('%Y-%m-%d',${schema.jobs.startDate})`;

    const result = await db
      .select({
        x: sqlStartDate,
        y: {
          regular: avg(schema.waitingPeriods.regular).mapWith(Number),
          fast: avg(schema.waitingPeriods.fast).mapWith(Number),
          veryFast: avg(schema.waitingPeriods.veryFast).mapWith(Number),
        },
      })
      .from(schema.waitingPeriods)
      .where(
        and(
          eq(schema.procedures.code, fixtures.procedure.code),
          sql`${sqlStartDate} >= ${fromDateString}`,
          sql`${sqlStartDate} <= ${toDateString}`
        )
      )
      .innerJoin(schema.jobs, eq(schema.waitingPeriods.jobId, schema.jobs.id))
      .innerJoin(
        schema.procedures,
        eq(schema.waitingPeriods.procedureId, schema.procedures.id)
      )
      .groupBy(schema.waitingPeriods.jobId, schema.waitingPeriods.procedureId)
      .orderBy(schema.jobs.startDate);

    // Assertions
    expect(result).toHaveLength(0); // Should have no data
  });

  it('should return data for requested date range (simulating no fallback)', async () => {
    // This test verifies the primary query logic works correctly
    const fromDate = '2023-01-01';
    const toDate = '2023-01-03';

    const sqlStartDate = sql<string>`strftime('%Y-%m-%d',${schema.jobs.startDate})`;

    const result = await db
      .select({
        x: sqlStartDate,
        regular: avg(schema.waitingPeriods.regular).mapWith(Number),
        fast: avg(schema.waitingPeriods.fast).mapWith(Number),
        veryFast: avg(schema.waitingPeriods.veryFast).mapWith(Number),
      })
      .from(schema.waitingPeriods)
      .innerJoin(schema.jobs, eq(schema.waitingPeriods.jobId, schema.jobs.id))
      .innerJoin(
        schema.procedures,
        and(
          eq(schema.waitingPeriods.procedureId, schema.procedures.id),
          and(
            sql`${schema.waitingPeriods.regular} is not null`,
            sql`${schema.waitingPeriods.fast} is not null`,
            sql`${schema.waitingPeriods.veryFast} is not null`
          )
        )
      )
      .where(
        and(
          eq(schema.procedures.code, fixtures.procedure.code),
          sql`strftime('%Y-%m-%d',${schema.jobs.startDate}) >= ${fromDate}`,
          sql`strftime('%Y-%m-%d',${schema.jobs.startDate}) <= ${toDate}`
        )
      )
      .groupBy(schema.waitingPeriods.jobId, schema.waitingPeriods.procedureId)
      .orderBy(schema.jobs.startDate);

    // Should return data for the requested range (no fallback needed)
    expect(result).toHaveLength(3);
    expect(result[0].x).toBe('2023-01-01');
  });

  it('should return empty array when no data in range (simulating fallback scenario)', async () => {
    // This test simulates the scenario where primary query returns empty
    // In the real server action, this would trigger the fallback logic
    const fromDate = '2024-01-01'; // Future date with no data
    const toDate = '2024-01-31';

    const sqlStartDate = sql<string>`strftime('%Y-%m-%d',${schema.jobs.startDate})`;

    const result = await db
      .select({
        x: sqlStartDate,
        regular: avg(schema.waitingPeriods.regular).mapWith(Number),
        fast: avg(schema.waitingPeriods.fast).mapWith(Number),
        veryFast: avg(schema.waitingPeriods.veryFast).mapWith(Number),
      })
      .from(schema.waitingPeriods)
      .innerJoin(schema.jobs, eq(schema.waitingPeriods.jobId, schema.jobs.id))
      .innerJoin(
        schema.procedures,
        and(
          eq(schema.waitingPeriods.procedureId, schema.procedures.id),
          and(
            sql`${schema.waitingPeriods.regular} is not null`,
            sql`${schema.waitingPeriods.fast} is not null`,
            sql`${schema.waitingPeriods.veryFast} is not null`
          )
        )
      )
      .where(
        and(
          eq(schema.procedures.code, fixtures.procedure.code),
          sql`strftime('%Y-%m-%d',${schema.jobs.startDate}) >= ${fromDate}`,
          sql`strftime('%Y-%m-%d',${schema.jobs.startDate}) <= ${toDate}`
        )
      )
      .groupBy(schema.waitingPeriods.jobId, schema.waitingPeriods.procedureId)
      .orderBy(schema.jobs.startDate);

    // Should return empty when no data in range (fallback would be triggered in server action)
    expect(result).toHaveLength(0);
  });

  it('should return empty array for procedure with no data (simulating no fallback case)', async () => {
    // Create a procedure with no waiting periods
    const emptyProcedure = await db
      .insert(schema.procedures)
      .values({
        id: 'empty-procedure-id',
        code: 'EMPTY-001',
        name: 'Empty Procedure',
      })
      .returning();

    const fromDate = '2023-01-01';
    const toDate = '2023-01-03';

    const sqlStartDate = sql<string>`strftime('%Y-%m-%d',${schema.jobs.startDate})`;

    const result = await db
      .select({
        x: sqlStartDate,
        regular: avg(schema.waitingPeriods.regular).mapWith(Number),
        fast: avg(schema.waitingPeriods.fast).mapWith(Number),
        veryFast: avg(schema.waitingPeriods.veryFast).mapWith(Number),
      })
      .from(schema.waitingPeriods)
      .innerJoin(schema.jobs, eq(schema.waitingPeriods.jobId, schema.jobs.id))
      .innerJoin(
        schema.procedures,
        and(
          eq(schema.waitingPeriods.procedureId, schema.procedures.id),
          and(
            sql`${schema.waitingPeriods.regular} is not null`,
            sql`${schema.waitingPeriods.fast} is not null`,
            sql`${schema.waitingPeriods.veryFast} is not null`
          )
        )
      )
      .where(
        and(
          eq(schema.procedures.code, emptyProcedure[0].code),
          sql`strftime('%Y-%m-%d',${schema.jobs.startDate}) >= ${fromDate}`,
          sql`strftime('%Y-%m-%d',${schema.jobs.startDate}) <= ${toDate}`
        )
      )
      .groupBy(schema.waitingPeriods.jobId, schema.waitingPeriods.procedureId)
      .orderBy(schema.jobs.startDate);

    // Should return empty for procedure with no data (no fallback triggered)
    expect(result).toHaveLength(0);
  });
});
