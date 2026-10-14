/** biome-ignore-all lint/suspicious/noConsole: We need for debug */
import { db } from '@/db';
import { waitingPeriods } from '@/db/schema';
import { makeFacilityRows, normalizeFPWTSchema } from '@/db/transforms';
import type { DataMap, SeedDbExecutor } from './types';

export async function insertWaitingTimes(
  input: DataMap,
  database: SeedDbExecutor = db
) {
  for (const [gitLabJobId, jobData] of Array.from(input.entries())) {
    console.info(`\tInserting waiting times for job ${gitLabJobId}.`);
    const rows = makeFacilityRows(jobData.procedures).map((row) =>
      normalizeFPWTSchema.parse(row)
    );
    console.info(`\t\tFound ${rows.length} rows.`);

    const job = await database.query.jobs.findFirst({
      columns: { id: true },
      where: (job, operators) => operators.eq(job.gitLabJobId, gitLabJobId),
    });

    if (!job) {
      console.warn(`Job with gitLabJobId ${gitLabJobId} not found.`);
      continue;
    }

    for (const row of rows) {
      const procedure = await database.query.procedures.findFirst({
        columns: { id: true },
        where: (p, operators) => operators.eq(p.code, row.procedure.code),
      });

      if (!procedure) {
        console.warn(
          `Procedure with code ${row.procedure.code} not found for job ${gitLabJobId}.`
        );
        continue;
      }

      const facility = await database.query.institutions.findFirst({
        columns: { id: true },
        where: (i, operators) => operators.eq(i.name, row.facility),
      });

      if (!facility) {
        console.warn(
          `Facility with name ${row.facility} not found for job ${gitLabJobId}.`
        );
        continue;
      }

      await database
        .insert(waitingPeriods)
        .values({
          jobId: job.id,
          procedureId: procedure.id,
          institutionId: facility.id,
          regular: row.waitingPeriods.regular,
          fast: row.waitingPeriods.fast,
          veryFast: row.waitingPeriods.veryFast,
        })
        .onConflictDoNothing()
        .run();
    }
  }
}
