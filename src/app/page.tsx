import { db } from '@/db';
import { desc } from 'drizzle-orm';
import { jobs as jobsTable } from '@/db/schema';
import { TimeRange } from '@/components/time';
import { Suspense } from 'react';
import { AvgWaitingPeriodsChart } from '@/components/charts/wp/chart';

export default async function Home() {
  const jobs = await db.query.jobs.findMany({
    columns: { id: true, startDate: true },
    orderBy: [desc(jobsTable.startDate)],
  });

  const firstJob = jobs.at(-1);
  const lastJob = jobs.at(0);

  return (
    <main className="z-0 space-y-2 p-4">
      <h1 id="attr-h1" className="text-2xl font-bold" aria-labelledby="attr-h1">
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

      <Suspense fallback="loading...">
        <AvgWaitingPeriodsChart />
      </Suspense>
    </main>
  );
}
