import { db } from '@/db';
import {
  institutions as institutionsTable,
  jobs as jobsTable,
  procedures as proceduresTable,
  waitingPeriods as waitingPeriodsTable,
} from '@/db/schema';
import { TimeRange } from '@/components/time';
import { asc, avg, desc, sql } from 'drizzle-orm';
import ChartCard from '@/components/charts/wp/card';
import { AverageWaitingTimeChart } from '@/components/charts/wp/chart-01';
import { getProcedureAvgWtPerJobChart } from '@/actions/get-procedure-avg-wt-per-job-chart';
import { addMonths, format } from 'date-fns';
import { Suspense } from 'react';
import { ClassicLoader } from '@/components/ui/loaders';

import { getProcedureWtForInstOnDay } from '@/actions/get-procedure-wt-for-inst-on-day';
import { ProcedureWtByInstOnDayChart } from '@/components/charts/wp/chart-02';

// day @mitar has started to collect data for the first time
const FIRST_DAY = new Date(2024, 3, 7);

export default async function Home() {
  const jobs = await db.query.jobs.findMany({
    columns: { id: true, startDate: true },
    orderBy: [desc(jobsTable.startDate)],
  });

  const firstJob = jobs.at(-1);
  const lastJob = jobs.at(0);

  const procedureOptions = await db
    .select({
      value: proceduresTable.code,
      label: sql<string>`${proceduresTable.name} || ' - ' || ${proceduresTable.code}`,
    })
    .from(proceduresTable)
    .orderBy(asc(proceduresTable.name));

  const toDate = new Date();
  const fromDate =
    addMonths(toDate, -1) > FIRST_DAY ? addMonths(toDate, -1) : FIRST_DAY;

  const chartDataAvg = procedureOptions[0].value
    ? await getProcedureAvgWtPerJobChart(
        procedureOptions[0].value,
        toDate,
        fromDate
      )
    : null;

  const chartDataInst = await getProcedureWtForInstOnDay(
    procedureOptions[0].value,
    toDate
  );

  return (
    <main className="z-0 space-y-2 p-4">
      <h1
        id="attr-h1"
        className="sr-only"
        aria-labelledby="attr-h1 attr-dataset-date-range"
      >
        Čakalne dobe
      </h1>
      <p id="attr-dataset-date-range">
        Podatki zbrani za obdobje:{' '}
        {firstJob && lastJob ? (
          <TimeRange
            startDate={firstJob.startDate}
            endDate={lastJob.startDate}
            options={{ timeZone: 'Europe/Ljubljana' }}
          />
        ) : null}
      </p>
      <section>
        <h2 className="sr-only">Grafi</h2>
        <ChartCard title="Povprečje">
          <Suspense fallback={<ClassicLoader />}>
            {chartDataAvg ? (
              <AverageWaitingTimeChart
                lineDatakeys={['regular', 'fast', 'veryFast']}
                initialData={chartDataAvg}
                initialDateRange={{
                  to: toDate,
                  from: fromDate,
                }}
                procedureOptions={procedureOptions}
                initialProcedure={procedureOptions[0].value}
              />
            ) : (
              'Žal ni podatkov za prikaz. Prosimo poskusite kasneje.'
            )}
          </Suspense>
        </ChartCard>
        <ChartCard title="Ustanove na dan">
          <Suspense fallback={<ClassicLoader />}>
            {chartDataAvg ? (
              <ProcedureWtByInstOnDayChart
                lineDatakeys={['regular', 'fast', 'veryFast']}
                initialData={chartDataInst}
                initialDate={toDate}
                procedureOptions={procedureOptions}
                initialProcedure={procedureOptions[0].value}
              />
            ) : (
              'Žal ni podatkov za prikaz. Prosimo poskusite kasneje.'
            )}
          </Suspense>
        </ChartCard>
      </section>
    </main>
  );
}
