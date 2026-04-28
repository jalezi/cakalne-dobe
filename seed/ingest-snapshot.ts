import { db as defaultDb } from '@/db';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import { insertInstitutions } from './seed-helpers/seed-institutions';
import { insertJobs } from './seed-helpers/seed-jobs';
import { insertMaxAllowedDays } from './seed-helpers/seed-max-allowed-days';
import {
  getProceduresToInsert,
  insertProcedures,
} from './seed-helpers/seed-procedures';
import { insertWaitingTimes } from './seed-helpers/seed-waiting-times';
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
  const procedures = getProceduresToInsert([data]);

  await database.transaction(async (tx) => {
    const { errors: insertJobErrors } = await insertJobs(
      [[gitLabJobId, data]],
      tx
    );
    if (insertJobErrors?.length) {
      throw insertJobErrors[0].error;
    }

    const { errors: insertProcedureErrors } = await insertProcedures(
      Array.from(procedures.values()),
      tx
    );
    if (insertProcedureErrors?.length) {
      throw insertProcedureErrors[0].error;
    }

    await insertMaxAllowedDays(dataMap, tx);
    await insertInstitutions(dataMap, tx);
    await insertWaitingTimes(dataMap, tx);
  });
}
