'use server';

import { db } from '@/db';
import {
  and,
  avg,
  desc,
  eq,
  sql,
  type Column as DrizzleColumn,
} from 'drizzle-orm';
import {
  jobs as jobsTable,
  procedures as proceduresTable,
  waitingPeriods as waitingPeriodsTable,
  institutions as institutionsTable,
} from '@/db/schema';
import { format } from 'date-fns';

const average = (col: DrizzleColumn) =>
  sql<number>`round(cast(${avg(col)} as FLOAT),2)`;

export async function getProcedureWtForInstOnDay(
  procedureCode: string,
  date: Date
) {
  const toDateString = format(date, 'yyyy-MM-dd');

  const sqlStartDate = sql<string>`strftime('%Y-%m-%d',${jobsTable.startDate})`;

  return await db
    .select({
      x: institutionsTable.name,
      y: {
        regular: average(waitingPeriodsTable.regular),
        fast: average(waitingPeriodsTable.fast),
        veryFast: average(waitingPeriodsTable.veryFast),
      },
    })
    .from(waitingPeriodsTable)
    .innerJoin(
      proceduresTable,
      eq(waitingPeriodsTable.procedureId, proceduresTable.id)
    )
    .innerJoin(jobsTable, eq(waitingPeriodsTable.jobId, jobsTable.id))
    .innerJoin(
      institutionsTable,
      eq(waitingPeriodsTable.institutionId, institutionsTable.id)
    )
    .where(
      and(
        eq(proceduresTable.code, procedureCode),
        eq(sqlStartDate, toDateString)
      )
    )
    .orderBy(desc(waitingPeriodsTable.regular))
    .groupBy(
      institutionsTable.name,
      waitingPeriodsTable.regular,
      waitingPeriodsTable.fast,
      waitingPeriodsTable.veryFast
    );
}
