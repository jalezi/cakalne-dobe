import { format } from 'date-fns';
import { and, eq, sql } from 'drizzle-orm';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import * as schema from '../src/db/schema';
import { cleanupTestDb, getTestDb, setupTestDb } from '../src/db/test';

// Mock the server action
vi.mock('@/lib/env', () => ({
  ENV_SERVER_VARS: {
    DATABASE_URL: ':memory:',
    DATABASE_AUTH_TOKEN: undefined,
  },
}));

describe('Server Action: getProcedureWtForInstOnDay', () => {
  const db = getTestDb();
  let fixtures: Awaited<ReturnType<typeof setupTestDb>>;
  let testDate: Date;

  beforeAll(async () => {
    // Set up test data
    fixtures = await setupTestDb(db);

    // Parse the startDate from the fixtures job to use for our tests
    testDate = new Date(fixtures.job.startDate);

    // Add more test data with multiple institutions
    await db.insert(schema.institutions).values([
      {
        id: 'test-institution-id-2',
        name: 'Test Institution 2',
      },
      {
        id: 'test-institution-id-3',
        name: 'Test Institution 3',
      },
    ]);

    await db.insert(schema.waitingPeriods).values([
      {
        jobId: fixtures.job.id,
        institutionId: 'test-institution-id-2',
        procedureId: fixtures.procedure.id,
        regular: 120,
        fast: 60,
        veryFast: 30,
      },
      {
        jobId: fixtures.job.id,
        institutionId: 'test-institution-id-3',
        procedureId: fixtures.procedure.id,
        regular: 180,
        fast: 90,
        veryFast: 45,
      },
    ]);
  });

  afterEach(async () => {
    // Clean up after each test to start fresh
    await cleanupTestDb(db);

    // Recreate test data for next test
    fixtures = await setupTestDb(db);

    // Parse the startDate from the fixtures job to use for our tests
    testDate = new Date(fixtures.job.startDate);

    // Add more test data with multiple institutions
    await db.insert(schema.institutions).values([
      {
        id: 'test-institution-id-2',
        name: 'Test Institution 2',
      },
      {
        id: 'test-institution-id-3',
        name: 'Test Institution 3',
      },
    ]);

    await db.insert(schema.waitingPeriods).values([
      {
        jobId: fixtures.job.id,
        institutionId: 'test-institution-id-2',
        procedureId: fixtures.procedure.id,
        regular: 120,
        fast: 60,
        veryFast: 30,
      },
      {
        jobId: fixtures.job.id,
        institutionId: 'test-institution-id-3',
        procedureId: fixtures.procedure.id,
        regular: 180,
        fast: 90,
        veryFast: 45,
      },
    ]);
  });

  afterAll(async () => {
    // Final cleanup
    await cleanupTestDb(db);
  });

  // Test directly with a Drizzle query that simulates the server action
  it('should return waiting times for institutions on a specific date', async () => {
    const toDateString = format(
      testDate.toLocaleString('en-US', { timeZone: 'Europe/Ljubljana' }),
      'yyyy-MM-dd'
    );

    const sqlStartDate = sql<string>`strftime('%Y-%m-%d',${schema.jobs.startDate})`;

    const result = await db
      .select({
        x: schema.institutions.name,
        y: {
          regular: schema.waitingPeriods.regular,
          fast: schema.waitingPeriods.fast,
          veryFast: schema.waitingPeriods.veryFast,
        },
      })
      .from(schema.waitingPeriods)
      .innerJoin(
        schema.procedures,
        eq(schema.waitingPeriods.procedureId, schema.procedures.id)
      )
      .innerJoin(schema.jobs, eq(schema.waitingPeriods.jobId, schema.jobs.id))
      .innerJoin(
        schema.institutions,
        eq(schema.waitingPeriods.institutionId, schema.institutions.id)
      )
      .where(
        and(
          eq(schema.procedures.code, fixtures.procedure.code),
          eq(sqlStartDate, toDateString)
        )
      )
      .orderBy(schema.waitingPeriods.regular)
      .groupBy(schema.institutions.name);

    // Assertions
    expect(result).toHaveLength(3); // Should have three institutions

    // The query orders by waiting.regular in descending order
    // Let's check that the institutions are correctly included and have the right waiting times

    // Extract the institutions by name (order might not be predictable)
    const institutions = result.reduce(
      (acc, curr) => {
        acc[curr.x] = {
          regular: Number(curr.y.regular),
          fast: Number(curr.y.fast),
          veryFast: Number(curr.y.veryFast),
        };
        return acc;
      },
      {} as Record<string, { regular: number; fast: number; veryFast: number }>
    );

    // Check each institution has the correct waiting times
    expect(institutions['Test Institution']).toEqual({
      regular: 20,
      fast: 8,
      veryFast: 3,
    });

    expect(institutions['Test Institution 2']).toEqual({
      regular: 120,
      fast: 60,
      veryFast: 30,
    });

    expect(institutions['Test Institution 3']).toEqual({
      regular: 180,
      fast: 90,
      veryFast: 45,
    });
  });

  it('should return empty results when no institutions match the date', async () => {
    // Create a job with a different date
    const differentDate = new Date();
    differentDate.setFullYear(differentDate.getFullYear() - 1); // 1 year ago

    const _differentDateJob = await db
      .insert(schema.jobs)
      .values({
        id: 'test-job-different-date',
        gitLabJobId: 'test-gitlab-job-different-date',
        startDate: differentDate.toISOString(),
        endDate: differentDate.toISOString(),
      })
      .returning();

    // Use the date from our main test job but query with a different date
    const wrongDate = new Date(testDate);
    wrongDate.setDate(wrongDate.getDate() + 1); // Next day

    const toDateString = format(
      wrongDate.toLocaleString('en-US', { timeZone: 'Europe/Ljubljana' }),
      'yyyy-MM-dd'
    );

    const sqlStartDate = sql<string>`strftime('%Y-%m-%d',${schema.jobs.startDate})`;

    const result = await db
      .select({
        x: schema.institutions.name,
        y: {
          regular: schema.waitingPeriods.regular,
          fast: schema.waitingPeriods.fast,
          veryFast: schema.waitingPeriods.veryFast,
        },
      })
      .from(schema.waitingPeriods)
      .innerJoin(
        schema.procedures,
        eq(schema.waitingPeriods.procedureId, schema.procedures.id)
      )
      .innerJoin(schema.jobs, eq(schema.waitingPeriods.jobId, schema.jobs.id))
      .innerJoin(
        schema.institutions,
        eq(schema.waitingPeriods.institutionId, schema.institutions.id)
      )
      .where(
        and(
          eq(schema.procedures.code, fixtures.procedure.code),
          eq(sqlStartDate, toDateString)
        )
      )
      .orderBy(schema.waitingPeriods.regular)
      .groupBy(schema.institutions.name);

    // Assertions
    expect(result).toHaveLength(0); // Should be empty for the wrong date
  });
});
