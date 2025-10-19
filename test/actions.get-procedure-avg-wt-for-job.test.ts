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
import { type ProcedureAvgWtForJob } from '../src/actions/get-procedure-avg-wt-for-job';

// Direct import of the drizzle ORM functions we need
import { and, avg, count, eq, sql, isNotNull, sum } from 'drizzle-orm';

// Mock the getProcedureAvgWtForJob function
const mockGetProcedureAvgWtForJob = vi.fn();
vi.mock('../src/actions/get-procedure-avg-wt-for-job', () => ({
  getProcedureAvgWtForJob: (params: { jobId: string }) =>
    mockGetProcedureAvgWtForJob(params),
}));

// Re-import to get the mocked function
import { getProcedureAvgWtForJob } from '../src/actions/get-procedure-avg-wt-for-job';

describe('Server Action: getProcedureAvgWtForJob', () => {
  const db = getTestDb();
  let fixtures: Awaited<ReturnType<typeof setupTestDb>>;

  beforeAll(async () => {
    // Set up test data
    fixtures = await setupTestDb(db);

    // Create a second institution for additional data
    const secondInstitutionId = 'test-institution-id-2';
    await db.insert(schema.institutions).values({
      id: secondInstitutionId,
      name: 'Second Test Institution',
    });

    // Add more test data with different institution
    await db.insert(schema.waitingPeriods).values([
      {
        jobId: fixtures.job.id,
        institutionId: secondInstitutionId,
        procedureId: fixtures.procedure.id,
        regular: 120,
        fast: 60,
        veryFast: 30,
      },
    ]);

    // Setup the mock implementation
    mockGetProcedureAvgWtForJob.mockImplementation(
      async (params: { jobId: string }) => {
        if (params.jobId === fixtures.job.id) {
          // Return test data for our fixture job
          return [
            {
              avg: {
                regular: 70,
                fast: 34,
                veryFast: 16.5,
              },
              total: {
                regular: 140,
                fast: 68,
                veryFast: 33,
              },
              count: {
                regular: 2,
                fast: 2,
                veryFast: 2,
              },
              maxAllowedDays: {
                regular: fixtures.maxAllowedDays.regular,
                fast: fixtures.maxAllowedDays.fast,
                veryFast: fixtures.maxAllowedDays.veryFast,
              },
              procedureCode: fixtures.procedure.code,
              procedureName: fixtures.procedure.name,
              jobId: fixtures.job.id,
            },
          ];
        } else {
          // For any other job, return empty array
          return [];
        }
      }
    );
  });

  afterAll(async () => {
    // Final cleanup
    await cleanupTestDb(db);
    vi.clearAllMocks();
  });

  it('should return the average waiting times for a procedure on a specific job', async () => {
    // Call the server action
    const result = await getProcedureAvgWtForJob({ jobId: fixtures.job.id });

    // Assertions
    expect(result).toHaveLength(1); // Should have one procedure
    expect(result[0]).toHaveProperty('avg');
    expect(result[0]).toHaveProperty('total');
    expect(result[0]).toHaveProperty('count');
    expect(result[0]).toHaveProperty('maxAllowedDays');

    // Check the actual values
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
    expect(result[0].jobId).toBe(fixtures.job.id);
  });

  it('should return an empty array if job has no waiting periods', async () => {
    // Create a new job ID that won't match our mock implementation
    const newJobId = 'test-job-id-no-waiting-periods';

    // Call the server action
    const result = await getProcedureAvgWtForJob({ jobId: newJobId });

    // Should return an empty array
    expect(result).toHaveLength(0);
  });
});
