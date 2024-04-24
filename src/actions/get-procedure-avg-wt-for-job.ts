'use server';
import { db } from '@/db';
import {
  waitingPeriods as waitingPeriodsTable,
  procedures as proceduresTable,
  maxAllowedDays as maxAllowedDaysTable,
} from '@/db/schema';
import {
  type Column as DrizzleColumn,
  and,
  avg,
  count,
  eq,
  sql,
  isNotNull,
  sum,
} from 'drizzle-orm';

type Params = {
  jobId: string;
};

export type ProcedureAvgWtForJob = Awaited<
  ReturnType<typeof getProcedureAvgWtForJob>
>[number];

const average = (col: DrizzleColumn) => sql<number>`cast(${avg(col)} as FLOAT)`;
const total = (col: DrizzleColumn) => sql<number>`cast(${sum(col)} as INTEGER)`;
export async function getProcedureAvgWtForJob(params: Params) {
  return await db
    .select({
      avg: {
        regular: average(waitingPeriodsTable.regular),
        fast: average(waitingPeriodsTable.fast),
        veryFast: average(waitingPeriodsTable.veryFast),
      },
      total: {
        regular: total(waitingPeriodsTable.regular),
        fast: total(waitingPeriodsTable.fast),
        veryFast: total(waitingPeriodsTable.veryFast),
      },
      count: {
        regular: count(waitingPeriodsTable.regular),
        fast: count(waitingPeriodsTable.fast),
        veryFast: count(waitingPeriodsTable.veryFast),
      },
      maxAllowedDays: {
        regular: maxAllowedDaysTable.regular,
        fast: maxAllowedDaysTable.fast,
        veryFast: maxAllowedDaysTable.veryFast,
      },
      procedureCode: proceduresTable.code,
      procedureName: proceduresTable.name,
      jobId: waitingPeriodsTable.jobId,
    })
    .from(waitingPeriodsTable)
    .where(and(eq(waitingPeriodsTable.jobId, params.jobId)))
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
    .innerJoin(
      maxAllowedDaysTable,
      and(
        eq(waitingPeriodsTable.procedureId, maxAllowedDaysTable.procedureId),
        eq(waitingPeriodsTable.jobId, maxAllowedDaysTable.jobId)
      )
    )
    .groupBy(waitingPeriodsTable.procedureId)
    .orderBy(proceduresTable.code);
}
