'use server';

import { db } from '@/db';
import {
  and,
  asc,
  avg,
  eq,
  gte,
  isNotNull,
  lte,
  sql,
  type Column as DrizzleColumn,
} from 'drizzle-orm';
import {
  jobs as jobsTable,
  procedures as proceduresTable,
  waitingPeriods as waitingPeriodsTable,
} from '@/db/schema';
import { format } from 'date-fns';

const average = (col: DrizzleColumn) =>
  sql<number>`round(cast(${avg(col)} as FLOAT),2)`;

export type ProcedureAvgWtForJob = Awaited<
  ReturnType<typeof getProcedureAvgWtPerJobChart>
>[number];

export async function getProcedureAvgWtPerJobChart(
  procedureCode: string,
  toDate: Date,
  fromDate: Date
) {
  const toDateString = format(
    toDate.toLocaleString('en-US', { timeZone: 'Europe/Ljubljana' }),
    'yyyy-MM-dd'
  );
  const fromDateString = format(
    fromDate.toLocaleString('en-US', { timeZone: 'Europe/Ljubljana' }),
    'yyyy-MM-dd'
  );

  const sqlStartDate = sql<string>`strftime('%Y-%m-%d',${jobsTable.startDate})`;

  return await db
    .select({
      x: sqlStartDate,
      y: {
        regular: average(waitingPeriodsTable.regular),
        fast: average(waitingPeriodsTable.fast),
        veryFast: average(waitingPeriodsTable.veryFast),
      },
    })
    .from(waitingPeriodsTable)
    .where(
      and(
        eq(proceduresTable.code, procedureCode),
        gte(sqlStartDate, fromDateString),
        lte(sqlStartDate, toDateString)
      )
    )
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
