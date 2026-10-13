import { db } from '@/db';
import { maxAllowedDays as maxAllowedDaysTable } from '@/db/schema';
import { getProceduresToInsert } from './seed-procedures';
import type { DataMap, SeedDbExecutor } from './types';

export async function insertMaxAllowedDays(
  input: DataMap,
  database: SeedDbExecutor = db
) {
  const dataMapEntries = Array.from(input.entries());
  const procedures = getProceduresToInsert(Array.from(input.values()));
  for (const [gitLabJobId, jobData] of dataMapEntries) {
    const result = await database.query.jobs.findFirst({
      columns: { id: true },
      where: (jobs, operators) => operators.eq(jobs.gitLabJobId, gitLabJobId),
    });
    if (!result) {
      console.warn(`Job with GitLab Job ID ${gitLabJobId} not found`);
      continue;
    }
    const jobId = result.id;
    for (const procedure of jobData.procedures) {
      const procedureData = procedures.get(procedure.code);
      if (!procedureData) {
        console.warn(`Procedure with code ${procedure.code} not found`);
        continue;
      }
      const dbProcedure = await database.query.procedures.findFirst({
        columns: { id: true },
        where: (procedures, operators) =>
          operators.eq(procedures.code, procedure.code),
      });
      if (!dbProcedure) {
        console.warn(`Procedure with code ${procedure.code} not found`);
        continue;
      }

      const maxAllowedDays = {
        jobId,
        procedureId: dbProcedure.id,
        regular: procedure.maxAllowedDays.regular,
        fast: procedure.maxAllowedDays.fast,
        veryFast: procedure.maxAllowedDays.veryFast,
      };
      await database
        .insert(maxAllowedDaysTable)
        .values(maxAllowedDays)
        .onConflictDoNothing()
        .run();
    }
  }
}
