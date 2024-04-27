'use server';

import { db } from '@/db';
import {
  and,
  asc,
  avg,
  eq,
  isNotNull,
  sql,
  type Column as DrizzleColumn,
} from 'drizzle-orm';
import {
  jobs as jobsTable,
  procedures as proceduresTable,
  waitingPeriods as waitingPeriodsTable,
} from '@/db/schema';

const average = (col: DrizzleColumn) =>
  sql<number>`round(cast(${avg(col)} as FLOAT),2)`;

export type ProcedureAvgWtForJob = Awaited<
  ReturnType<typeof getProcedureAvgWtPerJobChart>
>[number];

export async function getProcedureAvgWtPerJobChart(procedureCode: string) {
  return await db
    .select({
      x: sql<string>`strftime('%Y-%m-%d',${jobsTable.startDate})`,
      y: {
        regular: average(waitingPeriodsTable.regular),
        fast: average(waitingPeriodsTable.fast),
        veryFast: average(waitingPeriodsTable.veryFast),
      },
    })
    .from(waitingPeriodsTable)
    .where(eq(proceduresTable.code, procedureCode))
    .innerJoin(jobsTable, eq(waitingPeriodsTable.jobId, jobsTable.id))
    .innerJoin(
      proceduresTable,
      and(
        eq(waitingPeriodsTable.procedureId, proceduresTable.id),
        and(
          isNotNull(waitingPeriodsTable.regular),
          isNotNull(waitingPeriodsTable.fast),
          isNotNull(waitingPeriodsTable.veryFast)
        )
      )
    )
    .groupBy(waitingPeriodsTable.jobId, waitingPeriodsTable.procedureId)
    .orderBy(asc(jobsTable.startDate));
}
