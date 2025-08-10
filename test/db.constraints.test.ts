import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { cleanupTestDb, getTestDb, setupTestDb } from '../src/db/test';
import * as schema from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

describe('Database Constraints', () => {
    const db = getTestDb();
    let fixtures: Awaited<ReturnType<typeof setupTestDb>>;

    beforeAll(async () => {
        // Set up test data
        fixtures = await setupTestDb(db);
    });

    afterEach(async () => {
        // Clean up after each test to start fresh
        await cleanupTestDb(db);

        // Recreate test data for next test
        fixtures = await setupTestDb(db);
    });

    afterAll(async () => {
        // Final cleanup
        await cleanupTestDb(db);
    });

    describe('Unique constraints', () => {
        it('should enforce unique job gitLabJobId', async () => {
            // Try to insert a job with the same gitLabJobId
            const newJob = {
                id: createId(),
                gitLabJobId: fixtures.job.gitLabJobId, // Same gitLabJobId as existing job
                startDate: '2023-02-01T00:00:00Z',
                endDate: '2023-02-01T01:00:00Z',
            };

            // Inserting should throw an error due to unique constraint
            await expect(
                db.insert(schema.jobs).values(newJob)
            ).rejects.toThrow();
        });

        it('should enforce unique institution name', async () => {
            // Try to insert an institution with the same name
            const newInstitution = {
                id: createId(),
                name: fixtures.institution.name, // Same name as existing institution
            };

            // Inserting should throw an error due to unique constraint
            await expect(
                db.insert(schema.institutions).values(newInstitution)
            ).rejects.toThrow();
        });

        it('should enforce unique procedure code', async () => {
            // Try to insert a procedure with the same code
            const newProcedure = {
                id: createId(),
                code: fixtures.procedure.code, // Same code as existing procedure
                name: 'New Test Procedure',
            };

            // Inserting should throw an error due to unique constraint
            await expect(
                db.insert(schema.procedures).values(newProcedure)
            ).rejects.toThrow();
        });

        it('should enforce unique procedure name', async () => {
            // Try to insert a procedure with the same name
            const newProcedure = {
                id: createId(),
                code: 'TEST002',
                name: fixtures.procedure.name, // Same name as existing procedure
            };

            // Inserting should throw an error due to unique constraint
            await expect(
                db.insert(schema.procedures).values(newProcedure)
            ).rejects.toThrow();
        });
    });

    describe('Foreign key constraints', () => {
        it('should enforce foreign key constraints in maxAllowedDays', async () => {
            // Try to insert a maxAllowedDays with non-existent jobId
            const invalidMaxAllowedDays = {
                jobId: createId(), // Non-existent job ID
                procedureId: fixtures.procedure.id,
                regular: 30,
                fast: 10,
                veryFast: 5,
            };

            // Inserting should throw an error due to foreign key constraint
            await expect(
                db.insert(schema.maxAllowedDays).values(invalidMaxAllowedDays)
            ).rejects.toThrow();

            // Try to insert a maxAllowedDays with non-existent procedureId
            const invalidMaxAllowedDays2 = {
                jobId: fixtures.job.id,
                procedureId: createId(), // Non-existent procedure ID
                regular: 30,
                fast: 10,
                veryFast: 5,
            };

            // Inserting should throw an error due to foreign key constraint
            await expect(
                db.insert(schema.maxAllowedDays).values(invalidMaxAllowedDays2)
            ).rejects.toThrow();
        });

        it('should enforce foreign key constraints in waitingPeriods', async () => {
            // Try to insert a waitingPeriod with non-existent jobId
            const invalidWaitingPeriod = {
                jobId: createId(), // Non-existent job ID
                institutionId: fixtures.institution.id,
                procedureId: fixtures.procedure.id,
                regular: 20,
                fast: 8,
                veryFast: 3,
            };

            // Inserting should throw an error due to foreign key constraint
            await expect(
                db.insert(schema.waitingPeriods).values(invalidWaitingPeriod)
            ).rejects.toThrow();

            // Try to insert a waitingPeriod with non-existent institutionId
            const invalidWaitingPeriod2 = {
                jobId: fixtures.job.id,
                institutionId: createId(), // Non-existent institution ID
                procedureId: fixtures.procedure.id,
                regular: 20,
                fast: 8,
                veryFast: 3,
            };

            // Inserting should throw an error due to foreign key constraint
            await expect(
                db.insert(schema.waitingPeriods).values(invalidWaitingPeriod2)
            ).rejects.toThrow();

            // Try to insert a waitingPeriod with non-existent procedureId
            const invalidWaitingPeriod3 = {
                jobId: fixtures.job.id,
                institutionId: fixtures.institution.id,
                procedureId: createId(), // Non-existent procedure ID
                regular: 20,
                fast: 8,
                veryFast: 3,
            };

            // Inserting should throw an error due to foreign key constraint
            await expect(
                db.insert(schema.waitingPeriods).values(invalidWaitingPeriod3)
            ).rejects.toThrow();
        });
    });

    describe('Compound primary keys', () => {
        it('should enforce compound primary key in maxAllowedDays', async () => {
            // Try to insert a maxAllowedDays with the same jobId and procedureId
            const duplicateMaxAllowedDays = {
                jobId: fixtures.maxAllowedDays.jobId,
                procedureId: fixtures.maxAllowedDays.procedureId,
                regular: 40,
                fast: 15,
                veryFast: 8,
            };

            // Inserting should throw an error due to primary key constraint
            await expect(
                db.insert(schema.maxAllowedDays).values(duplicateMaxAllowedDays)
            ).rejects.toThrow();
        });

        it('should enforce compound primary key in waitingPeriods', async () => {
            // Try to insert a waitingPeriod with the same jobId, institutionId, and procedureId
            const duplicateWaitingPeriod = {
                jobId: fixtures.waitingPeriod.jobId,
                institutionId: fixtures.waitingPeriod.institutionId,
                procedureId: fixtures.waitingPeriod.procedureId,
                regular: 25,
                fast: 12,
                veryFast: 6,
            };

            // Inserting should throw an error due to primary key constraint
            await expect(
                db.insert(schema.waitingPeriods).values(duplicateWaitingPeriod)
            ).rejects.toThrow();
        });
    });

    describe('Cascade delete', () => {
        it('should cascade delete from jobs to maxAllowedDays', async () => {
            // First verify the maxAllowedDays exists
            const beforeDelete = await db.select().from(schema.maxAllowedDays).where(
                eq(schema.maxAllowedDays.jobId, fixtures.job.id)
            );
            expect(beforeDelete).toHaveLength(1);

            // Delete the job
            await db.delete(schema.jobs).where(eq(schema.jobs.id, fixtures.job.id));

            // Check that the maxAllowedDays was also deleted
            const afterDelete = await db.select().from(schema.maxAllowedDays).where(
                eq(schema.maxAllowedDays.jobId, fixtures.job.id)
            );
            expect(afterDelete).toHaveLength(0);
        });

        it('should cascade delete from jobs to waitingPeriods', async () => {
            // First verify the waitingPeriods exists
            const beforeDelete = await db.select().from(schema.waitingPeriods).where(
                eq(schema.waitingPeriods.jobId, fixtures.job.id)
            );
            expect(beforeDelete).toHaveLength(1);

            // Delete the job
            await db.delete(schema.jobs).where(eq(schema.jobs.id, fixtures.job.id));

            // Check that the waitingPeriods was also deleted
            const afterDelete = await db.select().from(schema.waitingPeriods).where(
                eq(schema.waitingPeriods.jobId, fixtures.job.id)
            );
            expect(afterDelete).toHaveLength(0);
        });

        it('should cascade delete from institutions to waitingPeriods', async () => {
            // First verify the waitingPeriods exists
            const beforeDelete = await db.select().from(schema.waitingPeriods).where(
                eq(schema.waitingPeriods.institutionId, fixtures.institution.id)
            );
            expect(beforeDelete).toHaveLength(1);

            // Delete the institution
            await db.delete(schema.institutions).where(eq(schema.institutions.id, fixtures.institution.id));

            // Check that the waitingPeriods was also deleted
            const afterDelete = await db.select().from(schema.waitingPeriods).where(
                eq(schema.waitingPeriods.institutionId, fixtures.institution.id)
            );
            expect(afterDelete).toHaveLength(0);
        });

        it('should cascade delete from procedures to maxAllowedDays and waitingPeriods', async () => {
            // First verify the maxAllowedDays exists
            const beforeDeleteMAD = await db.select().from(schema.maxAllowedDays).where(
                eq(schema.maxAllowedDays.procedureId, fixtures.procedure.id)
            );
            expect(beforeDeleteMAD).toHaveLength(1);

            // First verify the waitingPeriods exists
            const beforeDeleteWP = await db.select().from(schema.waitingPeriods).where(
                eq(schema.waitingPeriods.procedureId, fixtures.procedure.id)
            );
            expect(beforeDeleteWP).toHaveLength(1);

            // Delete the procedure
            await db.delete(schema.procedures).where(eq(schema.procedures.id, fixtures.procedure.id));

            // Check that the maxAllowedDays was also deleted
            const afterDeleteMAD = await db.select().from(schema.maxAllowedDays).where(
                eq(schema.maxAllowedDays.procedureId, fixtures.procedure.id)
            );
            expect(afterDeleteMAD).toHaveLength(0);

            // Check that the waitingPeriods was also deleted
            const afterDeleteWP = await db.select().from(schema.waitingPeriods).where(
                eq(schema.waitingPeriods.procedureId, fixtures.procedure.id)
            );
            expect(afterDeleteWP).toHaveLength(0);
        });
    });
});
