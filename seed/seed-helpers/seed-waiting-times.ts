/** biome-ignore-all lint/suspicious/noConsole: We need for debug */
import { db } from '@/db';
import { waitingPeriods } from '@/db/schema';
import { makeFacilityRows } from '@/lib/make-facility-row';
import { normalizeFPWTSchema } from '@/lib/zod-schemas/helpers-schema';
import type { DataMap } from './types';

export async function insertWaitingTimes(input: DataMap) {
  for (const [gitLabJobId, jobData] of Array.from(input.entries())) {
    console.info(`\tInserting waiting times for job ${gitLabJobId}.`);
    const rows = makeFacilityRows(jobData.procedures).map((row) =>
      normalizeFPWTSchema.parse(row)
    );
    console.info(`\t\tFound ${rows.length} rows.`);

    const job = await db.query.jobs.findFirst({
      columns: { id: true },
      where: (job, operators) => operators.eq(job.gitLabJobId, gitLabJobId),
    });

    if (!job) {
      console.warn(`Job with gitLabJobId ${gitLabJobId} not found.`);
      continue;
    }

    for (const row of rows) {
      const procedure = await db.query.procedures.findFirst({
        columns: { id: true },
        where: (p, operators) => operators.eq(p.code, row.procedure.code),
      });

      if (!procedure) {
        console.warn(
          `Procedure with code ${row.procedure.code} not found for job ${gitLabJobId}.`
        );
        continue;
      }

      const facility = await db.query.institutions.findFirst({
        columns: { id: true },
        where: (i, operators) => operators.eq(i.name, row.facility),
      });

      if (!facility) {
        console.warn(
          `Facility with name ${row.facility} not found for job ${gitLabJobId}.`
        );
        continue;
      }

      await db
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
