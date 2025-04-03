import { db } from '@/db';
import { jobs as jobsTable, procedures as proceduresTable } from '@/db/schema';
import { TimeRange } from '@/components/time';
import { desc, asc, sql } from 'drizzle-orm';
import ChartCard from '@/components/charts/wp/card';
import { Suspense } from 'react';
import { ClassicLoader } from '@/components/ui/loaders';

import { AvgWTChart } from '@/components/charts/avg-wt';
import { InstWTChart } from '@/components/charts/inst-wt';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default async function Home() {
  // Query for the first job (earliest date)
  const firstJobResult = await db.query.jobs.findMany({
    columns: { id: true, startDate: true },
    orderBy: [asc(jobsTable.startDate)],
    limit: 1,
  });
  const firstJob = firstJobResult[0];

  const jobs = await db.query.jobs.findMany({
    columns: { id: true, startDate: true },
    orderBy: [desc(jobsTable.startDate)],
  });

  // Query for the last job (latest date)
  const lastJobResult = await db.query.jobs.findMany({
    columns: { id: true, startDate: true },
    orderBy: [desc(jobsTable.startDate)],
    limit: 1,
  });
  const lastJob = lastJobResult[0];

  const procedureOptions = await db
    .select({
      value: proceduresTable.code,
      label: sql<string>`${proceduresTable.name} || ' - ' || ${proceduresTable.code}`,
    })
    .from(proceduresTable)
    .orderBy(asc(proceduresTable.name));

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
        {!firstJob || !lastJob ? (
          'Ni podatkov'
        ) : (
          <>
            Podatki zbrani za obdobje:{' '}
            <TimeRange
              startDate={firstJob.startDate}
              endDate={lastJob.startDate}
              options={{ timeZone: 'Europe/Ljubljana' }}
            />
          </>
        )}
      </p>
      <section>
        <h2 className="sr-only">Grafi</h2>
        <Tabs defaultValue="AvgWTChart">
          <TabsList>
            <TabsTrigger value="AvgWTChart">Povprečje</TabsTrigger>
            <TabsTrigger value="InstWtChart">Ustanove</TabsTrigger>
          </TabsList>
          <TabsContent value="AvgWTChart">
            <ChartCard title="Povprečje">
              <Suspense fallback={<ClassicLoader />}>
                <AvgWTChart
                  procedureCode={procedureOptions[0].value}
                  procedureOptions={procedureOptions}
                />
              </Suspense>
            </ChartCard>
          </TabsContent>
          <TabsContent value="InstWtChart">
            <ChartCard title="Ustanove na dan">
              <Suspense fallback={<ClassicLoader />}>
                <InstWTChart
                  procedureCode={procedureOptions[0].value}
                  procedureOptions={procedureOptions}
                  validDates={jobs.map((job) => job.startDate.slice(0, 10))}
                />
              </Suspense>
            </ChartCard>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}
