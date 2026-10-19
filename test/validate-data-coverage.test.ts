import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import * as schema from '../src/db/schema';
import { cleanupTestDb, createTestSchema, getTestDb } from '../src/db/test';

const db = getTestDb();

vi.mock('@/db', () => ({ db }));

let coverage: typeof import('../seed/seed-helpers/validate-data-coverage');

beforeAll(async () => {
  coverage = await import('../seed/seed-helpers/validate-data-coverage');
});

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const EMPTY_RANGE = { earliest: null, latest: null, files: [] };

describe('getAvailableJobsDateRange', () => {
  let jobsDir: string;

  beforeEach(async () => {
    jobsDir = await mkdtemp(join(tmpdir(), 'validate-data-coverage-'));
  });

  afterEach(async () => {
    await rm(jobsDir, { recursive: true, force: true });
  });

  it('returns an empty range for an empty directory', async () => {
    await expect(coverage.getAvailableJobsDateRange(jobsDir)).resolves.toEqual(
      EMPTY_RANGE
    );
  });

  it('returns an empty range and logs the error when the directory is missing', async () => {
    await expect(
      coverage.getAvailableJobsDateRange(join(jobsDir, 'missing'))
    ).resolves.toEqual(EMPTY_RANGE);
    expect(console.error).toHaveBeenCalledWith(
      'Error reading jobs directory:',
      expect.objectContaining({ code: 'ENOENT' })
    );
  });

  it('returns an empty range when no job file name holds a date', async () => {
    await writeFile(join(jobsDir, 'wp-latest.json'), '{}');

    await expect(coverage.getAvailableJobsDateRange(jobsDir)).resolves.toEqual(
      EMPTY_RANGE
    );
  });

  it('returns the dated job files sorted by date, with the earliest and latest dates', async () => {
    for (const file of [
      'wp-2026-10-18-05-00-00-3.json',
      'wp-2026-06-01-05-00-00-1.json',
      'wp-2026-10-16-05-00-00-2.json',
      'wp-latest.json',
      'notes.json',
      'wp-2026-10-17-05-00-00-4.txt',
    ]) {
      await writeFile(join(jobsDir, file), '{}');
    }
    await mkdir(join(jobsDir, 'archive'));

    await expect(coverage.getAvailableJobsDateRange(jobsDir)).resolves.toEqual({
      earliest: new Date(2026, 5, 1, 5, 0, 0),
      latest: new Date(2026, 9, 18, 5, 0, 0),
      files: [
        'wp-2026-06-01-05-00-00-1.json',
        'wp-2026-10-16-05-00-00-2.json',
        'wp-2026-10-18-05-00-00-3.json',
      ],
    });
  });
});

describe('getDatabaseDateRange', () => {
  beforeEach(async () => {
    await createTestSchema(db);
  });

  afterEach(async () => {
    await cleanupTestDb(db);
  });

  it('returns no dates and a zero count for an empty database', async () => {
    await expect(coverage.getDatabaseDateRange()).resolves.toEqual({
      earliest: null,
      latest: null,
      jobCount: 0,
    });
  });

  it('returns the earliest and latest job start dates and the job count', async () => {
    await db.insert(schema.jobs).values(
      [
        '2026-10-16T05:00:00Z',
        '2026-06-01T05:00:00Z',
        '2026-10-18T05:00:00Z',
      ].map((startDate, i) => ({
        gitLabJobId: String(i),
        startDate,
        endDate: startDate,
      }))
    );

    await expect(coverage.getDatabaseDateRange()).resolves.toEqual({
      earliest: new Date('2026-06-01T05:00:00Z'),
      latest: new Date('2026-10-18T05:00:00Z'),
      jobCount: 3,
    });
  });

  it('returns no dates and logs the error when the query fails', async () => {
    const failure = new Error('query failed');
    vi.spyOn(db, 'select').mockImplementationOnce(() => {
      throw failure;
    });

    await expect(coverage.getDatabaseDateRange()).resolves.toEqual({
      earliest: null,
      latest: null,
      jobCount: 0,
    });
    expect(console.error).toHaveBeenCalledWith(
      'Error querying database date range:',
      failure
    );
  });
});
