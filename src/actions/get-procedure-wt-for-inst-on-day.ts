'use server';

import { format } from 'date-fns';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  institutions as institutionsTable,
  jobs as jobsTable,
  procedures as proceduresTable,
  waitingPeriods as waitingPeriodsTable,
} from '@/db/schema';

export async function getProcedureWtForInstOnDay(
  procedureCode: string,
  date: Date
) {
  const toDateString = format(
    date.toLocaleString('en-US', { timeZone: 'Europe/Ljubljana' }),
    'yyyy-MM-dd'
  );

  const sqlStartDate = sql<string>`strftime('%Y-%m-%d',${jobsTable.startDate})`;

  return await db
    .select({
      x: institutionsTable.name,
      y: {
        regular: waitingPeriodsTable.regular,
        fast: waitingPeriodsTable.fast,
        veryFast: waitingPeriodsTable.veryFast,
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
    .groupBy(institutionsTable.name);
}
