import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import { handleJobIngestionRequest } from '../src/app/api/v1/insert-new-job-data/handle-job-ingestion-request';
import * as schema from '../src/db/schema';
import {
  cleanupTestDb,
  createTestSchema,
  failWritesTo,
  getTestDb,
} from '../src/db/test';
import { createInMemoryGitLabSource } from '../src/snapshot/source';

const db = getTestDb();

function snapshot(start: string): AllData {
  return {
    start,
    end: start,
    procedures: [
      {
        code: 'PROC-1',
        name: 'Procedure 1',
        maxAllowedDays: { regular: 30, fast: 10, veryFast: 5 },
        waitingPeriods: {
          regular: [{ facility: 'Facility 1', days: 20 }],
          fast: null,
          veryFast: null,
        },
      },
    ],
  };
}

// Latest run job gl-42, started on 2026-11-01 in Ljubljana
function sourceWithLatest(start = '2026-11-01T05:15:00+01:00') {
  return createInMemoryGitLabSource({
    jobs: [
      { name: 'pages', gitLabJobId: 'gl-43' },
      { name: 'run', gitLabJobId: 'gl-42' },
    ],
    snapshots: { 'gl-42': snapshot(start) },
  });
}

async function storeJob(gitLabJobId: string, startDate: string) {
  await db
    .insert(schema.jobs)
    .values({ gitLabJobId, startDate, endDate: startDate });
}

describe('handleJobIngestionRequest', () => {
  beforeEach(async () => {
    await createTestSchema(db);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanupTestDb(db);
  });

  it('ingests a new latest Job, looking the latest Job up once', async () => {
    const source = sourceWithLatest();
    const latestRunJob = vi.spyOn(source, 'latestRunJob');

    const result = await handleJobIngestionRequest(
      { success: true },
      { db, source }
    );

    expect(result).toEqual({
      success: true,
      data: {
        job: {
          id: expect.any(String),
          gitLabJobId: 'gl-42',
          day: '2026-11-01',
        },
        inserted: {
          procedures: 1,
          institutions: 1,
          maxAllowedDays: 1,
          waitingPeriods: 1,
        },
      },
    });
    expect(latestRunJob).toHaveBeenCalledOnce();
    await expect(db.$count(schema.jobs)).resolves.toBe(1);
  });

  it('answers alreadyStored without downloading the Snapshot when the latest id is stored', async () => {
    await storeJob('gl-42', '2026-11-01T05:15:00+01:00');
    const source = sourceWithLatest();
    const latestRunJob = vi.spyOn(source, 'latestRunJob');

    const result = await handleJobIngestionRequest(
      { success: true },
      { db, source }
    );

    expect(result).toEqual({
      success: true,
      data: { alreadyStored: true, gitLabJobId: 'gl-42' },
    });
    expect(source.fetched).toEqual([]);
    expect(latestRunJob).toHaveBeenCalledOnce();
  });

  it('answers alreadyStored with the day when another Job is stored for that day', async () => {
    await storeJob('gl-41', '2026-11-01T05:15:00+01:00');
    const source = sourceWithLatest('2026-11-01T10:00:00+01:00');

    const result = await handleJobIngestionRequest(
      { success: true },
      { db, source }
    );

    expect(result).toEqual({
      success: true,
      data: { alreadyStored: true, gitLabJobId: 'gl-42', day: '2026-11-01' },
    });
    expect(source.fetched).toEqual(['gl-42']);
    await expect(db.$count(schema.jobs)).resolves.toBe(1);
  });

  it('returns the validation error and asks GitLab nothing for an invalid payload', async () => {
    const source = sourceWithLatest();
    const latestRunJob = vi.spyOn(source, 'latestRunJob');

    const result = await handleJobIngestionRequest(
      { unknown: 'payload' },
      { db, source }
    );

    expect(result).toMatchObject({
      success: false,
      error: { code: 'INVALID_PAYLOAD' },
    });
    expect(latestRunJob).not.toHaveBeenCalled();
  });

  it.each([
    ['the job list fails', null, 'JOBS_FETCH_FAILED'],
    [
      'the job list has no run job',
      [{ name: 'pages', gitLabJobId: 'gl-43' }],
      'NO_RUN_JOB',
    ],
  ])('returns an error when %s', async (_case, jobs, code) => {
    const source = createInMemoryGitLabSource({ jobs, snapshots: {} });

    const result = await handleJobIngestionRequest(
      { success: true },
      { db, source }
    );

    expect(result).toMatchObject({ success: false, error: { code } });
    expect(source.fetched).toEqual([]);
  });

  it('returns the fetch error when the Snapshot cannot be downloaded', async () => {
    const source = createInMemoryGitLabSource({
      jobs: [{ name: 'run', gitLabJobId: 'gl-42' }],
      snapshots: {},
    });

    const result = await handleJobIngestionRequest(
      { success: true },
      { db, source }
    );

    expect(result).toMatchObject({
      success: false,
      error: { code: 'FETCH_FAILED' },
    });
  });

  it('returns the ingest error when the Snapshot cannot be stored', async () => {
    const restore = await failWritesTo(db, 'waiting_periods');

    const result = await handleJobIngestionRequest(
      { success: true },
      { db, source: sourceWithLatest() }
    );
    await restore();

    expect(result).toMatchObject({
      success: false,
      error: { code: 'WRITE_FAILED' },
    });
  });
});
