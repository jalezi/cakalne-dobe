import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from 'vitest';
import * as schema from '../src/db/schema';
import { cleanupTestDb, createTestSchema, getTestDb } from '../src/db/test';

const db = getTestDb();

vi.mock('@/db', () => ({ db }));
vi.mock('@/lib/env', () => ({
  ENV_SERVER_VARS: { DATABASE_URL: 'file:test.db' },
}));

function jobData(start: string) {
  return JSON.stringify({
    start,
    end: start,
    procedures: [
      {
        code: 'PROC-1',
        name: 'Procedure 1',
        maxAllowedDays: { regular: 30, fast: 10, veryFast: 5 },
        waitingPeriods: {
          regular: [{ facility: 'Facility 1', days: 20 }],
          fast: [{ facility: 'Facility 1', days: 8 }],
          veryFast: [{ facility: 'Facility 1', days: 3 }],
        },
      },
    ],
  });
}

// More than three months before the latest file, so outside the required range
const FILE_2001 = 'wp-2026-06-01-12-00-00-2001.json';
const FILE_2002 = 'wp-2026-10-16-12-00-00-2002.json';
const FILE_2003 = 'wp-2026-10-18-12-00-00-2003.json';

let ensureFreshDataModule: typeof import('../seed/ensure-fresh-data');
let smartSeeding: typeof import('../seed/seed-helpers/smart-seeding');
let jobsDir: string;
let consoleLog: MockInstance;
let consoleError: MockInstance;

beforeAll(async () => {
  ensureFreshDataModule = await import('../seed/ensure-fresh-data');
  smartSeeding = await import('../seed/seed-helpers/smart-seeding');
});

beforeEach(async () => {
  await createTestSchema(db);
  jobsDir = await mkdtemp(join(tmpdir(), 'ensure-fresh-data-'));
  consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  // An exit left in the code would end the whole test run
  vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`process.exit(${code})`);
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await cleanupTestDb(db);
  await rm(jobsDir, { recursive: true, force: true });
});

// The command prints dates in local time, so each job starts at the local time
// in its file name, whatever time zone the test runs in
async function writeJobFiles(...files: string[]) {
  for (const file of files) {
    const [y, mo, d, h, mi, s] = file.split('-').slice(1, 7).map(Number);
    const start = new Date(y, mo - 1, d, h, mi, s).toISOString();
    await writeFile(join(jobsDir, file), jobData(start));
  }
}

function logged(spy: MockInstance) {
  return spy.mock.calls.map((args) => args.join(' '));
}

describe('getDatabaseEnvironment', () => {
  it.each([
    ['file:dev.db', '🗄️  Local File Database (dev.db)'],
    ['dev.db', '🗄️  Local File Database (dev.db)'],
    // file: is checked first, so a local prod.db file reads as local
    ['file:prod.db', '🗄️  Local File Database (dev.db)'],
    ['/data/prod.db', '🗄️  Production File Database (prod.db)'],
    ['libsql://cakalne-dobe.turso.io', '☁️  Turso Cloud Database'],
    ['libsql://127.0.0.1:8080', '☁️  Turso Cloud Database'],
    ['https://cakalne-dobe.turso.io', '☁️  Turso Cloud Database'],
    ['http://127.0.0.1:8080', '🗄️  Database'],
  ])('describes %s as %s', (url, expected) => {
    expect(ensureFreshDataModule.getDatabaseEnvironment(url)).toBe(expected);
  });
});

describe('planSeeding', () => {
  it('returns the no-files message for an empty directory', async () => {
    await expect(ensureFreshDataModule.planSeeding(jobsDir)).resolves.toEqual({
      error: [
        '❌ No job files found in mock-data/jobs/',
        '   Please ensure job files exist before running this command.',
      ],
    });
  });

  it('plans only the files within three months of the latest file', async () => {
    await writeJobFiles(FILE_2001, FILE_2002, FILE_2003);

    const plan = await ensureFreshDataModule.planSeeding(jobsDir);

    expect(plan).toMatchObject({
      dbCoverage: { earliest: null, latest: null, jobCount: 0 },
      availableFiles: { files: [FILE_2001, FILE_2002, FILE_2003] },
      validation: {
        isValid: true,
        requiredStart: new Date(2026, 6, 18, 12, 0, 0),
        requiredEnd: new Date(2026, 9, 18, 12, 0, 0),
      },
      filesToSeed: [FILE_2002, FILE_2003],
    });
  });

  it('counts jobs already seeded and still plans their files, which seeding then skips', async () => {
    await writeJobFiles(FILE_2002, FILE_2003);
    await db.insert(schema.jobs).values({
      gitLabJobId: '2002',
      startDate: '2026-10-16T12:00:00Z',
      endDate: '2026-10-16T12:00:00Z',
    });

    const plan = await ensureFreshDataModule.planSeeding(jobsDir);

    expect(plan).toMatchObject({
      dbCoverage: {
        earliest: new Date('2026-10-16T12:00:00Z'),
        latest: new Date('2026-10-16T12:00:00Z'),
        jobCount: 1,
      },
      filesToSeed: [FILE_2002, FILE_2003],
    });
  });
});

describe('ensureFreshData', () => {
  it('returns 1 when there are no job files', async () => {
    await expect(ensureFreshDataModule.ensureFreshData(jobsDir)).resolves.toBe(
      1
    );
    expect(logged(consoleError)).toEqual([
      '❌ No job files found in mock-data/jobs/',
      '   Please ensure job files exist before running this command.',
    ]);
  });

  it('seeds the missing jobs, prints the coverage change and returns 0', async () => {
    await writeJobFiles(FILE_2001, FILE_2002, FILE_2003);

    await expect(ensureFreshDataModule.ensureFreshData(jobsDir)).resolves.toBe(
      0
    );

    const seeded = await db
      .select({ gitLabJobId: schema.jobs.gitLabJobId })
      .from(schema.jobs);
    expect(seeded).toEqual([{ gitLabJobId: '2002' }, { gitLabJobId: '2003' }]);
    expect(logged(consoleLog)).toEqual(
      expect.arrayContaining([
        '   Found 2 file(s) within required date range',
        '   Before: 0 jobs | N/A - N/A',
        '   After:  2 jobs | 2026-10-16 - 2026-10-18',
        '✅ Data coverage check completed successfully!\n',
      ])
    );
  });

  it('skips jobs already seeded and returns 0 when there is nothing to seed', async () => {
    await writeJobFiles(FILE_2002, FILE_2003);
    await ensureFreshDataModule.ensureFreshData(jobsDir);
    consoleLog.mockClear();

    await expect(ensureFreshDataModule.ensureFreshData(jobsDir)).resolves.toBe(
      0
    );

    const lines = logged(consoleLog);
    expect(lines).toEqual(
      expect.arrayContaining([
        '  ⏭️  Skipping existing job: 2002',
        '  ⏭️  Skipping existing job: 2003',
        '✅ Data coverage check completed successfully!\n',
      ])
    );
    expect(lines).not.toContain('📊 Database Coverage Update:');
  });

  it('reports a file that fails to load, seeds the rest and returns 1', async () => {
    await writeJobFiles(FILE_2003);
    await writeFile(join(jobsDir, FILE_2002), '{"broken":');

    await expect(ensureFreshDataModule.ensureFreshData(jobsDir)).resolves.toBe(
      1
    );

    expect(logged(consoleLog)).toEqual(
      expect.arrayContaining([
        '   After:  1 jobs | 2026-10-18 - 2026-10-18',
        '⚠️  Data coverage check completed with warnings.\n',
      ])
    );
    expect(logged(consoleError)).toEqual(
      expect.arrayContaining([
        '⚠️  Warning: Some errors occurred during seeding:',
        expect.stringContaining(`"fileName":"${FILE_2002}"`),
      ])
    );
  });

  it('prints at most five errors and shortens a long file list', async () => {
    const brokenFiles = [1, 2, 3, 4, 5, 6].map(
      (n) => `wp-2026-10-1${n}-12-00-00-300${n}.json`
    );
    for (const file of brokenFiles) {
      await writeFile(join(jobsDir, file), '{"broken":');
    }

    await expect(ensureFreshDataModule.ensureFreshData(jobsDir)).resolves.toBe(
      1
    );

    expect(logged(consoleLog)).toEqual(
      expect.arrayContaining([expect.stringContaining('... 2 more files ...')])
    );
    const errors = logged(consoleError);
    expect(errors.filter((line) => line.startsWith('   - '))).toHaveLength(5);
    expect(errors.at(-1)).toBe('   ... and 1 more errors');
  });

  it('prints a fatal error and returns 1 when seeding throws', async () => {
    await writeJobFiles(FILE_2003);
    vi.spyOn(smartSeeding, 'seedMissingJobsOnly').mockRejectedValueOnce(
      new Error('database is locked')
    );

    await expect(ensureFreshDataModule.ensureFreshData(jobsDir)).resolves.toBe(
      1
    );

    expect(logged(consoleError)).toEqual(
      expect.arrayContaining([
        '\n❌ Fatal error during data coverage check:',
        'database is locked',
      ])
    );
  });
});
