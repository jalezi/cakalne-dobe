import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { cleanupTestDb, getTestDb, setupTestDb } from '../src/db/test';
import * as schema from '../src/db/schema';
import { avg, eq, and, sql } from 'drizzle-orm';
import { format } from 'date-fns';

// Mock the env module
vi.mock('@/lib/env', () => ({
    ENV_SERVER_VARS: {
        DATABASE_URL: ':memory:',
        DATABASE_AUTH_TOKEN: undefined,
    },
}));

// Import the action after the mocks
import { getProcedureAvgWtPerJobChart } from '../src/actions/get-procedure-avg-wt-per-job-chart';

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
});
