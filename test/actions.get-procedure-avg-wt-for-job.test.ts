import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { cleanupTestDb, getTestDb, setupTestDb } from '../src/db/test';
import { getProcedureAvgWtForJob } from '../src/actions/get-procedure-avg-wt-for-job';
import * as schema from '../src/db/schema';

// Mock the env module
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

        // Add more test data specifically for this test
        await db.insert(schema.waitingPeriods).values([
            {
                jobId: fixtures.job.id,
                institutionId: fixtures.institution.id,
                procedureId: fixtures.procedure.id,
                regular: 120,
                fast: 60,
                veryFast: 30,
            },
            {
                jobId: fixtures.job.id,
                institutionId: fixtures.institution.id,
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

        // Add more test data specifically for this test
        await db.insert(schema.waitingPeriods).values([
            {
                jobId: fixtures.job.id,
                institutionId: fixtures.institution.id,
                procedureId: fixtures.procedure.id,
                regular: 120,
                fast: 60,
                veryFast: 30,
            },
            {
                jobId: fixtures.job.id,
                institutionId: fixtures.institution.id,
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
        expect(result[0].avg.regular).toBeCloseTo(150); // (120 + 180) / 2
        expect(result[0].avg.fast).toBeCloseTo(75); // (60 + 90) / 2
        expect(result[0].avg.veryFast).toBeCloseTo(37.5); // (30 + 45) / 2

        expect(result[0].total.regular).toBe(300); // 120 + 180
        expect(result[0].total.fast).toBe(150); // 60 + 90
        expect(result[0].total.veryFast).toBe(75); // 30 + 45

        expect(result[0].count.regular).toBe(2);
        expect(result[0].count.fast).toBe(2);
        expect(result[0].count.veryFast).toBe(2);

        expect(result[0].procedureCode).toBe(fixtures.procedure.code);
        expect(result[0].procedureName).toBe(fixtures.procedure.name);
        expect(result[0].jobId).toBe(fixtures.job.id);
    });

    it('should return an empty array if job has no waiting periods', async () => {
        // Create a new job with no waiting periods
        const newJob = await db.insert(schema.jobs).values({
            id: 'test-job-id-no-waiting-periods',
            gitLabJobId: 'test-git-lab-job-id-no-waiting-periods',
            startDate: '2023-01-01T00:00:00Z',
            endDate: '2023-01-01T01:00:00Z',
        }).returning();

        // Call the server action
        const result = await getProcedureAvgWtForJob({ jobId: newJob[0].id });

        // Should return an empty array
        expect(result).toHaveLength(0);
    });
});
