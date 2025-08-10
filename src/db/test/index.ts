import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { sql } from 'drizzle-orm';
import * as schema from '../schema';
import { createId } from '@paralleldrive/cuid2';

/**
 * Creates an in-memory SQLite database for testing
 * @returns A drizzle database instance connected to an in-memory SQLite database
 */
export function getTestDb() {
  // Create an in-memory SQLite database for testing
  const client = createClient({
    url: ':memory:',
  });

  // Create a drizzle instance with our schema
  const db = drizzle(client, { schema });

  return db;
}

/**
 * Creates the database schema for testing
 * This applies the schema directly using SQL statements
 * @param db The database instance to setup schema for
 */
export async function createTestSchema(db: ReturnType<typeof getTestDb>) {
  // Enable foreign keys and strict constraints
  await db.run(`PRAGMA foreign_keys = ON;`);
  await db.run(`PRAGMA strict = ON;`);

  // Create jobs table
  await db.run(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      git_lab_job_id TEXT NOT NULL DEFAULT '' UNIQUE,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  // Create institutions table
  await db.run(`
    CREATE TABLE IF NOT EXISTS institutions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  // Create procedures table
  await db.run(`
    CREATE TABLE IF NOT EXISTS procedures (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(code, name)
    );
  `);

  // Create max_allowed_days table
  await db.run(`
    CREATE TABLE IF NOT EXISTS max_allowed_days (
      job_id TEXT NOT NULL,
      procedure_id TEXT NOT NULL,
      regular INTEGER NOT NULL,
      fast INTEGER NOT NULL,
      very_fast INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (job_id, procedure_id),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (procedure_id) REFERENCES procedures(id) ON DELETE CASCADE
    );
  `);

  // Create waiting_periods table
  await db.run(`
    CREATE TABLE IF NOT EXISTS waiting_periods (
      job_id TEXT NOT NULL,
      institution_id TEXT NOT NULL,
      procedure_id TEXT NOT NULL,
      regular INTEGER,
      fast INTEGER,
      very_fast INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (job_id, institution_id, procedure_id),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
      FOREIGN KEY (procedure_id) REFERENCES procedures(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS waiting_periods_job_index ON waiting_periods(job_id);
    CREATE INDEX IF NOT EXISTS waiting_periods_institution_index ON waiting_periods(institution_id);
    CREATE INDEX IF NOT EXISTS waiting_periods_procedure_index ON waiting_periods(procedure_id);
  `);

  return db;
}

/**
 * Creates test fixtures for a database instance
 * This includes creating basic data for testing
 * @param db The database instance to populate with test data
 */
export async function setupTestDb(db: ReturnType<typeof getTestDb>) {
  // Create schema first
  await createTestSchema(db);

  // Create job data
  const jobId = createId();
  const testJob = {
    id: jobId,
    gitLabJobId: '12345',
    startDate: '2023-01-01T00:00:00Z',
    endDate: '2023-01-01T01:00:00Z',
  };

  // Insert job
  await db.insert(schema.jobs).values(testJob);

  // Create institution data
  const institutionId = createId();
  const testInstitution = {
    id: institutionId,
    name: 'Test Institution',
  };

  // Insert institution
  await db.insert(schema.institutions).values(testInstitution);

  // Create procedure data
  const procedureId = createId();
  const testProcedure = {
    id: procedureId,
    code: 'TEST001',
    name: 'Test Procedure',
  };

  // Insert procedure
  await db.insert(schema.procedures).values(testProcedure);

  // Create max allowed days data
  const testMaxAllowedDays = {
    jobId: jobId,
    procedureId: procedureId,
    regular: 30,
    fast: 10,
    veryFast: 5,
  };

  // Insert max allowed days
  await db.insert(schema.maxAllowedDays).values(testMaxAllowedDays);

  // Create waiting period data
  const testWaitingPeriod = {
    jobId: jobId,
    institutionId: institutionId,
    procedureId: procedureId,
    regular: 20,
    fast: 8,
    veryFast: 3,
  };

  // Insert waiting period
  await db.insert(schema.waitingPeriods).values(testWaitingPeriod);

  return {
    job: testJob,
    institution: testInstitution,
    procedure: testProcedure,
    maxAllowedDays: testMaxAllowedDays,
    waitingPeriod: testWaitingPeriod,
  };
}

/**
 * Cleans up the test database by removing all data
 * @param db The database instance to clean up
 */
export async function cleanupTestDb(db: ReturnType<typeof getTestDb>) {
  await db.delete(schema.waitingPeriods).where(sql`1=1`);
  await db.delete(schema.maxAllowedDays).where(sql`1=1`);
  await db.delete(schema.procedures).where(sql`1=1`);
  await db.delete(schema.institutions).where(sql`1=1`);
  await db.delete(schema.jobs).where(sql`1=1`);
}
