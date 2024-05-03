import { db } from '@/db';
import { jobs as jobsTable, procedures } from '@/db/schema';
import { TimeRange } from '@/components/time';
import { asc, desc, sql } from 'drizzle-orm';
import ChartCard from '@/components/charts/wp/card';
import { Chart } from '@/components/charts/wp/chart';
import { getProcedureAvgWtPerJobChart } from '@/actions/get-procedure-avg-wt-per-job-chart';
import { addMonths } from 'date-fns';
import { Suspense } from 'react';
import { ClassicLoader } from '@/components/ui/loaders';

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
      value: procedures.code,
      label: sql<string>`${procedures.name} || ' - ' || ${procedures.code}`,
    })
    .from(procedures)
    .orderBy(asc(procedures.name));

  const toDate = new Date();
  const fromDate =
    addMonths(toDate, -1) > FIRST_DAY ? addMonths(toDate, -1) : FIRST_DAY;

  const chartData = procedureOptions[0].value
    ? await getProcedureAvgWtPerJobChart(
        procedureOptions[0].value,
        toDate,
        fromDate
      )
    : null;

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
            {chartData ? (
              <Chart
                lineDatakeys={['regular', 'fast', 'veryFast']}
                initialData={chartData}
                initialDateRange={{
                  to: toDate,
                  from: fromDate,
                }}
                procedureOptions={procedureOptions}
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
