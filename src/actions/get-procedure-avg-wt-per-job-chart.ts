'use server';

import { format, subDays } from 'date-fns';
import {
  and,
  asc,
  avg,
  type Column as DrizzleColumn,
  desc,
  eq,
  gte,
  isNotNull,
  lte,
  sql,
} from 'drizzle-orm';
import { db } from '@/db';
import {
  jobs as jobsTable,
  procedures as proceduresTable,
  waitingPeriods as waitingPeriodsTable,
} from '@/db/schema';

const average = (col: DrizzleColumn) =>
  sql<number>`round(cast(${avg(col)} as FLOAT),2)`;

export type ChartDataPoint = {
  x: string;
  y: {
    regular: number | null;
    fast: number | null;
    veryFast: number | null;
  };
};

export type ChartDataResult = {
  data: ChartDataPoint[];
  isFallback: boolean;
  actualFromDate?: Date;
  actualToDate?: Date;
};

export async function getProcedureAvgWtPerJobChart(
  procedureCode: string,
  toDate: Date,
  fromDate: Date
): Promise<ChartDataResult> {
  const toDateString = format(
    toDate.toLocaleString('en-US', { timeZone: 'Europe/Ljubljana' }),
    'yyyy-MM-dd'
  );
  const fromDateString = format(
    fromDate.toLocaleString('en-US', { timeZone: 'Europe/Ljubljana' }),
    'yyyy-MM-dd'
  );

  const sqlStartDate = sql<string>`strftime('%Y-%m-%d',${jobsTable.startDate})`;

  // Try the default query first
  const data = await db
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

  // If data exists, return it without fallback
  if (data.length > 0) {
    return {
      data,
      isFallback: false,
    };
  }

  // No data found in the requested range - try fallback to last 30 days
  const fallbackToDate = new Date();
  const fallbackFromDate = subDays(fallbackToDate, 30);
  const fallbackToDateString = format(
    fallbackToDate.toLocaleString('en-US', { timeZone: 'Europe/Ljubljana' }),
    'yyyy-MM-dd'
  );
  const fallbackFromDateString = format(
    fallbackFromDate.toLocaleString('en-US', { timeZone: 'Europe/Ljubljana' }),
    'yyyy-MM-dd'
  );

  const fallbackData = await db
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
        gte(sqlStartDate, fallbackFromDateString),
        lte(sqlStartDate, fallbackToDateString)
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
    .orderBy(desc(jobsTable.startDate));

  return {
    data: fallbackData,
    isFallback: fallbackData.length > 0,
    actualFromDate: fallbackData.length > 0 ? fallbackFromDate : undefined,
    actualToDate: fallbackData.length > 0 ? fallbackToDate : undefined,
  };
}
