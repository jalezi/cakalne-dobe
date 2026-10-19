import { db } from '@/db';
import { renameProcedures } from '@/db/rename-procedures';
import type { InsertProcedure } from '@/db/schema/procedures';
import { procedures as proceduresTable } from '@/db/schema/procedures';
import { normalizeProcedureName } from '@/db/transforms';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import { handleError } from '@/utils/handle-error';
import type { CustomError, ProcedureInsertData, SeedDbExecutor } from './types';

export function getProceduresToInsert(
  jobs: AllData[]
): Map<string, ProcedureInsertData> {
  const procedures: Map<string, ProcedureInsertData> = new Map();
  for (const jobData of jobs) {
    for (const procedure of jobData.procedures) {
      const hasProcedure = procedures.has(procedure.code);
      if (!hasProcedure) {
        procedures.set(procedure.code, {
          code: procedure.code,
          name: normalizeProcedureName(procedure.name),
        });
      }
    }
  }
  return procedures;
}

export async function insertProcedures(
  procedures: Pick<InsertProcedure, 'code' | 'name'>[],
  database: SeedDbExecutor = db
) {
  const errors: CustomError[] = [];
  const unique: string[] = [];
  const existing: string[] = [];
  // Rename first, so a name an existing procedure gives up is free for a new one
  const renamed = await renameProcedures(
    database,
    procedures,
    await getStoredNames(procedures, database)
  );
  for (const procedure of procedures) {
    try {
      const result = await database
        .insert(proceduresTable)
        .values(procedure)
        .onConflictDoNothing()
        .run();
      if (result.rowsAffected === 0) {
        existing.push(procedure.code);
      } else {
        unique.push(procedure.code);
      }
    } catch (error) {
      const newError = handleError(error);
      errors.push({ error: newError });
      continue;
    }
  }
  if (errors.length > 0) {
    return { errors, existing, unique, renamed };
  }
  return { errors: null, existing, unique, renamed };
}

/** Stored name by code, for the given codes already stored. */
async function getStoredNames(
  procedures: ProcedureInsertData[],
  database: SeedDbExecutor
): Promise<Map<string, string>> {
  const stored = await database.query.procedures.findMany({
    columns: { code: true, name: true },
    where: (table, operators) =>
      operators.inArray(
        table.code,
        procedures.map(({ code }) => code)
      ),
  });
  return new Map(stored.map(({ code, name }) => [code, name]));
}
