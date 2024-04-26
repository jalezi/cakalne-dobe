import dynamic from 'next/dynamic';

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

const MyLineChart = dynamic(
  () => import('./line').then((mod) => mod.MyLineChart),
  { ssr: false }
);

const average = (col: DrizzleColumn) =>
  sql<number>`round(cast(${avg(col)} as FLOAT),2)`;

export async function AvgWaitingPeriodsChart({ procedureCode = '1003P' }) {
  const averageWaitingTimePerJob = await db
    .select({
      date: sql<string>`strftime('%Y-%m-%d',${jobsTable.startDate})`,
      regular: average(waitingPeriodsTable.regular),
      fast: average(waitingPeriodsTable.fast),
      veryFast: average(waitingPeriodsTable.veryFast),
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

  return (
    <MyLineChart
      lineDataKeys={['regular', 'fast', 'veryFast']}
      lineStrokes={['#987', '#8884d8', '#82ca9d']}
      chartData={averageWaitingTimePerJob.map((el) => ({
        ...el,
        date: new Date(el.date),
      }))}
      lineFriendlyNames={{
        regular: 'Običajno',
        fast: 'Hitro',
        veryFast: 'Zelo hitro',
      }}
    />
  );
}
