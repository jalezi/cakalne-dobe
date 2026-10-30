import { asc } from 'drizzle-orm';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import * as schema from '../src/db/schema';
import { cleanupTestDb, createTestSchema, getTestDb } from '../src/db/test';
import { fetchAndPrepareSnapshotFromSource } from '../src/snapshot';
import { createInMemorySnapshotSource } from '../src/snapshot/source';

const apiDb = getTestDb();
const seedDb = getTestDb();

// The API path writes to `@/db`; the seed path is given its database
vi.mock('@/db', () => ({ db: apiDb }));

type TestDb = ReturnType<typeof getTestDb>;

function buildSnapshot(procedures: { code: string; name: string }[]): AllData {
  return {
    start: '2026-10-01T00:00:00Z',
    end: '2026-10-01T01:00:00Z',
    procedures: procedures.map(({ code, name }) => ({
      code,
      name,
      maxAllowedDays: { regular: 90, fast: 30, veryFast: 14 },
      waitingPeriods: {
        regular: [{ facility: 'Institution A', days: 60 }],
        fast: null,
        veryFast: null,
      },
    })),
  };
}

describe('procedure names', () => {
  let processJobData: typeof import('../src/app/api/v1/insert-new-job-data/db-operations').processJobData;
  let ingestSnapshot: typeof import('../seed/ingest-snapshot').ingestSnapshot;
  let insertProcedures: typeof import('../seed/seed-helpers/seed-procedures').insertProcedures;

  // fetchAndPrepareSnapshot without the HTTP fetch, then the route's transaction
  async function ingestThroughApi(data: AllData, gitLabJobId: string) {
    const source = createInMemorySnapshotSource({ [gitLabJobId]: data });
    const prepared = await fetchAndPrepareSnapshotFromSource(
      gitLabJobId,
      source
    );
    if (!prepared.success) throw new Error(prepared.error.message);
    return processJobData(
      prepared.data.jobData,
      prepared.data.snapshotInsertPayload
    );
  }

  const paths: {
    path: string;
    db: TestDb;
    ingest: (data: AllData, gitLabJobId: string) => Promise<unknown>;
  }[] = [
    { path: 'API', db: apiDb, ingest: ingestThroughApi },
    {
      path: 'seed',
      db: seedDb,
      ingest: (data, gitLabJobId) =>
        ingestSnapshot(data, gitLabJobId, { db: seedDb }),
    },
  ];

  beforeAll(async () => {
    ({ processJobData } = await import(
      '../src/app/api/v1/insert-new-job-data/db-operations'
    ));
    ({ ingestSnapshot } = await import('../seed/ingest-snapshot'));
    ({ insertProcedures } = await import(
      '../seed/seed-helpers/seed-procedures'
    ));
  });

  beforeEach(async () => {
    await createTestSchema(apiDb);
    await createTestSchema(seedDb);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanupTestDb(apiDb);
    await cleanupTestDb(seedDb);
  });

  it('stores the same names through both paths, spaces around dashes included', async () => {
    const data = buildSnapshot([
      { code: 'P1', name: '  Dermatološki pregled  -  prvi ' },
      { code: 'P2', name: 'Fizioterapevtska obravnava - prvi obisk' },
      { code: 'P3', name: 'Pregled mišično-skeletnega sistema' },
    ]);

    await ingestThroughApi(data, 'gitlab-job-1');
    await ingestSnapshot(data, 'gitlab-job-1', { db: seedDb });

    const expected = [
      { code: 'P1', name: 'Dermatološki pregled - prvi' },
      { code: 'P2', name: 'Fizioterapevtska obravnava - prvi obisk' },
      { code: 'P3', name: 'Pregled mišično-skeletnega sistema' },
    ];
    await expect(storedProcedures(apiDb)).resolves.toEqual(expected);
    await expect(storedProcedures(seedDb)).resolves.toEqual(expected);
  });

  it.each(paths)(
    '$path: updates a stored seed-form name to the Snapshot form',
    async ({ db, ingest }) => {
      await db.insert(schema.procedures).values([
        { code: 'P1', name: 'Dermatološki pregled-prvi' },
        { code: 'P2', name: 'Kontrolni pregled' },
      ]);

      await ingest(
        buildSnapshot([
          { code: 'P1', name: 'Dermatološki pregled - prvi' },
          { code: 'P2', name: 'Kontrolni pregled' },
        ]),
        'gitlab-job-1'
      );

      await expect(storedProcedures(db)).resolves.toEqual([
        { code: 'P1', name: 'Dermatološki pregled - prvi' },
        { code: 'P2', name: 'Kontrolni pregled' },
      ]);
    }
  );

  it.each(paths)(
    '$path: skips a rename to a name another code holds, warns, and ingests the rest',
    async ({ db, ingest }) => {
      // P9 holds P1's new name and isn't in the Snapshot, so nothing frees it
      await db.insert(schema.procedures).values([
        { code: 'P1', name: 'Pregled-prvi' },
        { code: 'P2', name: 'Kontrola-drugi' },
        { code: 'P9', name: 'Pregled - prvi' },
      ]);

      await ingest(
        buildSnapshot([
          { code: 'P1', name: 'Pregled - prvi' },
          { code: 'P2', name: 'Kontrola - drugi' },
        ]),
        'gitlab-job-1'
      );

      expect(console.warn).toHaveBeenCalledWith(
        'Procedure P1 keeps the name "Pregled-prvi": "Pregled - prvi" belongs to P9.'
      );
      await expect(storedProcedures(db)).resolves.toEqual([
        { code: 'P1', name: 'Pregled-prvi' },
        { code: 'P2', name: 'Kontrola - drugi' },
        { code: 'P9', name: 'Pregled - prvi' },
      ]);
      await expect(db.$count(schema.jobs)).resolves.toBe(1);
      await expect(db.$count(schema.waitingPeriods)).resolves.toBe(2);
    }
  );

  it.each(paths)(
    '$path: gives a name freed by an earlier rename to a later one',
    async ({ db, ingest }) => {
      await db.insert(schema.procedures).values([
        { code: 'P1', name: 'Pregled-prvi' },
        { code: 'P2', name: 'Pregled-drugi' },
      ]);

      await ingest(
        buildSnapshot([
          { code: 'P1', name: 'Pregled - prvi' },
          { code: 'P2', name: 'Pregled-prvi' },
        ]),
        'gitlab-job-1'
      );

      expect(console.warn).not.toHaveBeenCalled();
      await expect(storedProcedures(db)).resolves.toEqual([
        { code: 'P1', name: 'Pregled - prvi' },
        { code: 'P2', name: 'Pregled-prvi' },
      ]);
    }
  );

  it.each(paths)(
    '$path: skips a rename to the name of a new code in the same Snapshot, and inserts the new code',
    async ({ db, ingest }) => {
      await db
        .insert(schema.procedures)
        .values({ code: 'P1', name: 'Pregled-prvi' });

      // P1 first: renaming it before P5's insert would take P5's name
      await ingest(
        buildSnapshot([
          { code: 'P1', name: 'Pregled - prvi' },
          { code: 'P5', name: 'Pregled - prvi' },
        ]),
        'gitlab-job-1'
      );

      expect(console.warn).toHaveBeenCalledWith(
        'Procedure P1 keeps the name "Pregled-prvi": "Pregled - prvi" belongs to P5.'
      );
      await expect(storedProcedures(db)).resolves.toEqual([
        { code: 'P1', name: 'Pregled-prvi' },
        { code: 'P5', name: 'Pregled - prvi' },
      ]);
      await expect(db.$count(schema.jobs)).resolves.toBe(1);
      await expect(db.$count(schema.waitingPeriods)).resolves.toBe(2);
    }
  );

  it.each(paths)(
    '$path: inserts a new code under the name a rename in the same Snapshot frees',
    async ({ db, ingest }) => {
      await db
        .insert(schema.procedures)
        .values({ code: 'P1', name: 'Kontrola' });

      // P5 first: inserting it before P1's rename would hit P1's stored name
      await ingest(
        buildSnapshot([
          { code: 'P5', name: 'Kontrola' },
          { code: 'P1', name: 'Kontrola - prvi' },
        ]),
        'gitlab-job-1'
      );

      expect(console.warn).not.toHaveBeenCalled();
      await expect(storedProcedures(db)).resolves.toEqual([
        { code: 'P1', name: 'Kontrola - prvi' },
        { code: 'P5', name: 'Kontrola' },
      ]);
      await expect(db.$count(schema.waitingPeriods)).resolves.toBe(2);
    }
  );

  it.each(paths)(
    '$path: keeps a name a rename frees for the new code, not a later rename',
    async ({ db, ingest }) => {
      await db.insert(schema.procedures).values([
        { code: 'P1', name: 'Kontrola' },
        { code: 'P2', name: 'Pregled' },
      ]);

      await ingest(
        buildSnapshot([
          { code: 'P5', name: 'Kontrola' },
          { code: 'P1', name: 'Kontrola - prvi' },
          { code: 'P2', name: 'Kontrola' },
        ]),
        'gitlab-job-1'
      );

      expect(console.warn).toHaveBeenCalledWith(
        'Procedure P2 keeps the name "Pregled": "Kontrola" belongs to P5.'
      );
      await expect(storedProcedures(db)).resolves.toEqual([
        { code: 'P1', name: 'Kontrola - prvi' },
        { code: 'P2', name: 'Pregled' },
        { code: 'P5', name: 'Kontrola' },
      ]);
    }
  );

  it.each(paths)(
    '$path: leaves a procedure whose name already matches untouched',
    async ({ db, ingest }) => {
      const updatedAt = new Date('2026-01-01T00:00:00Z');
      await db
        .insert(schema.procedures)
        .values({ code: 'P1', name: 'Pregled - prvi', updatedAt });

      await ingest(
        buildSnapshot([{ code: 'P1', name: 'Pregled - prvi' }]),
        'gitlab-job-1'
      );

      expect(console.warn).not.toHaveBeenCalled();
      await expect(
        db
          .select({
            name: schema.procedures.name,
            updatedAt: schema.procedures.updatedAt,
          })
          .from(schema.procedures)
      ).resolves.toEqual([{ name: 'Pregled - prvi', updatedAt }]);
    }
  );

  it('API: keeps the counts it reports, a renamed procedure counted as existing', async () => {
    await apiDb
      .insert(schema.procedures)
      .values({ code: 'P1', name: 'Pregled-prvi' });

    const result = await ingestThroughApi(
      buildSnapshot([
        { code: 'P1', name: 'Pregled - prvi' },
        { code: 'P2', name: 'Kontrola - drugi' },
      ]),
      'gitlab-job-1'
    );

    expect(result.meta.length.procedures).toEqual({
      total: 2,
      inserted: 1,
      existing: 1,
    });
  });

  it('seed: counts a renamed procedure as existing and reports it as renamed', async () => {
    await seedDb.insert(schema.procedures).values([
      { code: 'P1', name: 'Pregled-prvi' },
      { code: 'P2', name: 'Kontrola' },
    ]);

    const result = await insertProcedures(
      [
        { code: 'P1', name: 'Pregled - prvi' },
        { code: 'P2', name: 'Kontrola' },
        { code: 'P3', name: 'Posvet - prvi' },
      ],
      seedDb
    );

    expect(result).toEqual({
      errors: null,
      existing: ['P1', 'P2'],
      unique: ['P3'],
      renamed: ['P1'],
    });
  });
});

function storedProcedures(db: TestDb) {
  return db
    .select({ code: schema.procedures.code, name: schema.procedures.name })
    .from(schema.procedures)
    .orderBy(asc(schema.procedures.code));
}
