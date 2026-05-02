import { db as defaultDb } from '@/db';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import { createIngestionPipeline } from './pipeline';
import { getProceduresToInsert } from './seed-helpers/seed-procedures';
import type { DataMap } from './seed-helpers/types';

type IngestSnapshotOptions = {
  db?: typeof defaultDb;
};

export async function ingestSnapshot(
  data: AllData,
  gitLabJobId: string,
  options: IngestSnapshotOptions = {}
): Promise<void> {
  const database = options.db ?? defaultDb;
  const dataMap: DataMap = new Map([[gitLabJobId, data]]);
  const procedures = Array.from(getProceduresToInsert([data]).values());

  await database.transaction(async (tx) => {
    await createIngestionPipeline([[gitLabJobId, data]])
      .withProcedures(procedures)
      .withDataMap(dataMap)
      .execute(tx);
  });
}
