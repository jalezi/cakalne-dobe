import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { getProcedureAvgWtForJob } from '../src/db/queries/waiting-periods';
import * as schema from '../src/db/schema';
import { cleanupTestDb, getTestDb, setupTestDb } from '../src/db/test';

// Mock the server action
vi.mock('@/lib/env', () => ({
  ENV_SERVER_VARS: {
    DATABASE_URL: ':memory:',
    DATABASE_AUTH_TOKEN: undefined,
  },
}));

describe('Server Action: getProcedureAvgWtForJob', () => {
  const db = getTestDb();
  let fixtures: Awaited<ReturnType<typeof setupTestDb>>;

  beforeAll(async () => {
    // Set up test data
    fixtures = await setupTestDb(db);

    // Add more test data specifically for this test (instead of duplicating records)
    await db.insert(schema.institutions).values({
      id: 'test-institution-id-2',
      name: 'Test Institution 2',
    });

    await db.insert(schema.waitingPeriods).values([
      {
        jobId: fixtures.job.id,
        institutionId: 'test-institution-id-2', // Use the new institution
        procedureId: fixtures.procedure.id,
        regular: 120,
        fast: 60,
        veryFast: 30,
      },
    ]);
  });

  afterEach(async () => {
    // Clean up after each test to start fresh
    await cleanupTestDb(db);

    // Recreate test data for next test
    fixtures = await setupTestDb(db);

    // Add more test data specifically for this test (instead of duplicating records)
    await db.insert(schema.institutions).values({
      id: 'test-institution-id-2',
      name: 'Test Institution 2',
    });

    await db.insert(schema.waitingPeriods).values([
      {
        jobId: fixtures.job.id,
        institutionId: 'test-institution-id-2', // Use the new institution
        procedureId: fixtures.procedure.id,
        regular: 120,
        fast: 60,
        veryFast: 30,
      },
    ]);
  });

  afterAll(async () => {
    // Final cleanup
    await cleanupTestDb(db);
  });

  // Test directly with a Drizzle query that simulates the server action
  it('should calculate the correct average waiting times', async () => {
    const result = await getProcedureAvgWtForJob(db, {
      jobId: fixtures.job.id,
    });

    // Assertions
    expect(result).toHaveLength(1); // Should have one procedure

    // Check the actual values (we expect the average of original waiting period + new one)
    expect(result[0].avg.regular).toBeCloseTo(70); // (20 + 120) / 2
    expect(result[0].avg.fast).toBeCloseTo(34); // (8 + 60) / 2
    expect(result[0].avg.veryFast).toBeCloseTo(16.5); // (3 + 30) / 2

    expect(result[0].total.regular).toBe(140); // 20 + 120
    expect(result[0].total.fast).toBe(68); // 8 + 60
    expect(result[0].total.veryFast).toBe(33); // 3 + 30

    expect(result[0].count.regular).toBe(2);
    expect(result[0].count.fast).toBe(2);
    expect(result[0].count.veryFast).toBe(2);

    expect(result[0].procedureCode).toBe(fixtures.procedure.code);
    expect(result[0].procedureName).toBe(fixtures.procedure.name);
  });

  it('should return empty results for a job with no waiting periods', async () => {
    // Create a new job with no waiting periods
    const newJob = await db
      .insert(schema.jobs)
      .values({
        id: 'test-job-id-no-waiting-periods',
        gitLabJobId: 'test-git-lab-job-id-no-waiting-periods',
        startDate: '2023-01-01T00:00:00Z',
        endDate: '2023-01-01T01:00:00Z',
      })
      .returning();

    const result = await getProcedureAvgWtForJob(db, { jobId: newJob[0].id });

    // With GROUP BY, no matching rows returns an empty array
    expect(result).toHaveLength(0);
  });
});
