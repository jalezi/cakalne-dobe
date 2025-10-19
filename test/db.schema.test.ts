import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { cleanupTestDb, getTestDb, setupTestDb } from '../src/db/test';
import * as schema from '../src/db/schema';
import { eq } from 'drizzle-orm';

describe('Database Schema', () => {
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

  it('should insert and retrieve jobs correctly', async () => {
    // Get the job we inserted in the setup
    const jobs = await db
      .select()
      .from(schema.jobs)
      .where(eq(schema.jobs.id, fixtures.job.id));

    // Check that we got the job
    expect(jobs).toHaveLength(1);
    expect(jobs[0].id).toBe(fixtures.job.id);
    expect(jobs[0].gitLabJobId).toBe(fixtures.job.gitLabJobId);
    expect(jobs[0].startDate).toBe(fixtures.job.startDate);
    expect(jobs[0].endDate).toBe(fixtures.job.endDate);
  });

  it('should insert and retrieve institutions correctly', async () => {
    // Get the institution we inserted in the setup
    const institutions = await db
      .select()
      .from(schema.institutions)
      .where(eq(schema.institutions.id, fixtures.institution.id));

    // Check that we got the institution
    expect(institutions).toHaveLength(1);
    expect(institutions[0].id).toBe(fixtures.institution.id);
    expect(institutions[0].name).toBe(fixtures.institution.name);
  });

  it('should insert and retrieve procedures correctly', async () => {
    // Get the procedure we inserted in the setup
    const procedures = await db
      .select()
      .from(schema.procedures)
      .where(eq(schema.procedures.id, fixtures.procedure.id));

    // Check that we got the procedure
    expect(procedures).toHaveLength(1);
    expect(procedures[0].id).toBe(fixtures.procedure.id);
    expect(procedures[0].code).toBe(fixtures.procedure.code);
    expect(procedures[0].name).toBe(fixtures.procedure.name);
  });

  it('should insert and retrieve maxAllowedDays correctly', async () => {
    // Get the maxAllowedDays we inserted in the setup
    const maxAllowedDays = await db
      .select()
      .from(schema.maxAllowedDays)
      .where(eq(schema.maxAllowedDays.jobId, fixtures.maxAllowedDays.jobId));

    // Check that we got the maxAllowedDays
    expect(maxAllowedDays).toHaveLength(1);
    expect(maxAllowedDays[0].jobId).toBe(fixtures.maxAllowedDays.jobId);
    expect(maxAllowedDays[0].procedureId).toBe(
      fixtures.maxAllowedDays.procedureId
    );
    expect(maxAllowedDays[0].regular).toBe(fixtures.maxAllowedDays.regular);
    expect(maxAllowedDays[0].fast).toBe(fixtures.maxAllowedDays.fast);
    expect(maxAllowedDays[0].veryFast).toBe(fixtures.maxAllowedDays.veryFast);
  });

  it('should insert and retrieve waitingPeriods correctly', async () => {
    // Get the waitingPeriods we inserted in the setup
    const waitingPeriods = await db
      .select()
      .from(schema.waitingPeriods)
      .where(eq(schema.waitingPeriods.jobId, fixtures.waitingPeriod.jobId));

    // Check that we got the waitingPeriods
    expect(waitingPeriods).toHaveLength(1);
    expect(waitingPeriods[0].jobId).toBe(fixtures.waitingPeriod.jobId);
    expect(waitingPeriods[0].institutionId).toBe(
      fixtures.waitingPeriod.institutionId
    );
    expect(waitingPeriods[0].procedureId).toBe(
      fixtures.waitingPeriod.procedureId
    );
    expect(waitingPeriods[0].regular).toBe(fixtures.waitingPeriod.regular);
    expect(waitingPeriods[0].fast).toBe(fixtures.waitingPeriod.fast);
    expect(waitingPeriods[0].veryFast).toBe(fixtures.waitingPeriod.veryFast);
  });

  it('should maintain relationships between tables', async () => {
    // Test job -> waitingPeriods relationship
    const jobWaitingPeriods = await db
      .select()
      .from(schema.waitingPeriods)
      .where(eq(schema.waitingPeriods.jobId, fixtures.job.id));
    expect(jobWaitingPeriods).toHaveLength(1);

    // Test institution -> waitingPeriods relationship
    const institutionWaitingPeriods = await db
      .select()
      .from(schema.waitingPeriods)
      .where(eq(schema.waitingPeriods.institutionId, fixtures.institution.id));
    expect(institutionWaitingPeriods).toHaveLength(1);

    // Test procedure -> waitingPeriods relationship
    const procedureWaitingPeriods = await db
      .select()
      .from(schema.waitingPeriods)
      .where(eq(schema.waitingPeriods.procedureId, fixtures.procedure.id));
    expect(procedureWaitingPeriods).toHaveLength(1);

    // Test job -> maxAllowedDays relationship
    const jobMaxAllowedDays = await db
      .select()
      .from(schema.maxAllowedDays)
      .where(eq(schema.maxAllowedDays.jobId, fixtures.job.id));
    expect(jobMaxAllowedDays).toHaveLength(1);

    // Test procedure -> maxAllowedDays relationship
    const procedureMaxAllowedDays = await db
      .select()
      .from(schema.maxAllowedDays)
      .where(eq(schema.maxAllowedDays.procedureId, fixtures.procedure.id));
    expect(procedureMaxAllowedDays).toHaveLength(1);
  });
});
