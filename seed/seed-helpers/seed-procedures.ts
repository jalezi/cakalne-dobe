import type { InsertProcedure } from '@/db/schema/procedures';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import type { CustomError, ProcedureInsertData } from './types';
import { db } from '@/db';
import { procedures as proceduresTable } from '@/db/schema/procedures';
import { handleError } from '@/utils/handle-error';
import { trimStringWithDashes } from '@/lib/zod-schemas/helpers-schema';

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
          name: trimStringWithDashes.parse(procedure.name),
        });
      }
    }
  }
  return procedures;
}

export async function insertProcedures(
  procedures: Pick<InsertProcedure, 'code' | 'name'>[]
) {
  const errors: CustomError[] = [];
  const unique: string[] = [];
  const existing: string[] = [];
  for (const procedure of procedures) {
    try {
      const result = await db
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
    return { errors, existing, unique };
  }
  return { errors: null, existing, unique };
}
