import { asc } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import * as schema from '../src/db/schema';
import { cleanupTestDb, createTestSchema, getTestDb } from '../src/db/test';
import { ingestSnapshot } from '../src/snapshot';

const db = getTestDb();

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

function ingest(data: AllData, gitLabJobId: string) {
  return ingestSnapshot(db, gitLabJobId, data);
}

describe('procedure names', () => {
  beforeEach(async () => {
    await createTestSchema(db);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanupTestDb(db);
  });

  it('stores normalized names, spaces around dashes included', async () => {
    const data = buildSnapshot([
      { code: 'P1', name: '  Dermatološki pregled  -  prvi ' },
      { code: 'P2', name: 'Fizioterapevtska obravnava - prvi obisk' },
      { code: 'P3', name: 'Pregled mišično-skeletnega sistema' },
    ]);

    await ingest(data, 'gitlab-job-1');

    await expect(storedProcedures()).resolves.toEqual([
      { code: 'P1', name: 'Dermatološki pregled - prvi' },
      { code: 'P2', name: 'Fizioterapevtska obravnava - prvi obisk' },
      { code: 'P3', name: 'Pregled mišično-skeletnega sistema' },
    ]);
  });

  it('updates a stored seed-form name to the Snapshot form', async () => {
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

    await expect(storedProcedures()).resolves.toEqual([
      { code: 'P1', name: 'Dermatološki pregled - prvi' },
      { code: 'P2', name: 'Kontrolni pregled' },
    ]);
  });

  it('skips a rename to a name another code holds, warns, and ingests the rest', async () => {
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
    await expect(storedProcedures()).resolves.toEqual([
      { code: 'P1', name: 'Pregled-prvi' },
      { code: 'P2', name: 'Kontrola - drugi' },
      { code: 'P9', name: 'Pregled - prvi' },
    ]);
    await expect(db.$count(schema.jobs)).resolves.toBe(1);
    await expect(db.$count(schema.waitingPeriods)).resolves.toBe(2);
  });

  it('gives a name freed by an earlier rename to a later one', async () => {
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
    await expect(storedProcedures()).resolves.toEqual([
      { code: 'P1', name: 'Pregled - prvi' },
      { code: 'P2', name: 'Pregled-prvi' },
    ]);
  });

  it('skips a rename to the name of a new code in the same Snapshot, and inserts the new code', async () => {
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
    await expect(storedProcedures()).resolves.toEqual([
      { code: 'P1', name: 'Pregled-prvi' },
      { code: 'P5', name: 'Pregled - prvi' },
    ]);
    await expect(db.$count(schema.jobs)).resolves.toBe(1);
    await expect(db.$count(schema.waitingPeriods)).resolves.toBe(2);
  });

  it('inserts a new code under the name a rename in the same Snapshot frees', async () => {
    await db.insert(schema.procedures).values({ code: 'P1', name: 'Kontrola' });

    // P5 first: inserting it before P1's rename would hit P1's stored name
    await ingest(
      buildSnapshot([
        { code: 'P5', name: 'Kontrola' },
        { code: 'P1', name: 'Kontrola - prvi' },
      ]),
      'gitlab-job-1'
    );

    expect(console.warn).not.toHaveBeenCalled();
    await expect(storedProcedures()).resolves.toEqual([
      { code: 'P1', name: 'Kontrola - prvi' },
      { code: 'P5', name: 'Kontrola' },
    ]);
    await expect(db.$count(schema.waitingPeriods)).resolves.toBe(2);
  });

  it('keeps a name a rename frees for the new code, not a later rename', async () => {
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
    await expect(storedProcedures()).resolves.toEqual([
      { code: 'P1', name: 'Kontrola - prvi' },
      { code: 'P2', name: 'Pregled' },
      { code: 'P5', name: 'Kontrola' },
    ]);
  });

  it('leaves a procedure whose name already matches untouched', async () => {
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
  });

  it('does not count a renamed procedure as inserted', async () => {
    await db
      .insert(schema.procedures)
      .values({ code: 'P1', name: 'Pregled-prvi' });

    const result = await ingest(
      buildSnapshot([
        { code: 'P1', name: 'Pregled - prvi' },
        { code: 'P2', name: 'Kontrola - drugi' },
      ]),
      'gitlab-job-1'
    );

    expect(result.success && result.data.inserted.procedures).toBe(1);
  });
});

function storedProcedures() {
  return db
    .select({ code: schema.procedures.code, name: schema.procedures.name })
    .from(schema.procedures)
    .orderBy(asc(schema.procedures.code));
}
