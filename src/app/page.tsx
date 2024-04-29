import { db } from '@/db';
import { jobs as jobsTable, procedures } from '@/db/schema';
import { TimeRange } from '@/components/time';
import { asc, desc, sql } from 'drizzle-orm';
import ChartCard from '@/components/charts/wp/card';
import { Chart } from '@/components/charts/wp/chart';
import { getProcedureAvgWtPerJobChart } from '@/actions/get-procedure-avg-wt-per-job-chart';

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
  const chartData = procedureOptions[0].value
    ? await getProcedureAvgWtPerJobChart(procedureOptions[0].value)
    : null;

  return (
    <main className="z-0 space-y-2 p-4">
      <h1 id="attr-h1" className="text-2xl font-bold">
        Čakalne dobe
      </h1>
      <div>
        Podatki zbrani za obdobje:{' '}
        {firstJob && lastJob ? (
          <TimeRange
            startDate={firstJob.startDate}
            endDate={lastJob.startDate}
            options={{ timeZone: 'Europe/Ljubljana' }}
          />
        ) : null}
      </div>
      <ChartCard title="Povprečje">
        {chartData ? (
          <Chart
            lineDatakeys={['regular', 'fast', 'veryFast']}
            initialData={chartData}
            procedureOptions={procedureOptions}
          />
        ) : (
          'Žal ni podatkov za prikaz. Prosimo poskusite kasneje.'
        )}
      </ChartCard>
    </main>
  );
}
