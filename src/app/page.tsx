import { db } from '@/db';
import { jobs as jobsTable } from '@/db/schema';
import { TimeRange } from '@/components/time';
import { desc, } from 'drizzle-orm';

export default async function Home() {
  const jobs = await db.query.jobs.findMany({
    columns: { id: true, startDate: true },
    orderBy: [desc(jobsTable.startDate)],
  });

  const firstJob = jobs.at(-1);
  const lastJob = jobs.at(0);

  if (!firstJob || !lastJob) {
    return (
      <div className="grid min-h-[480px] place-items-center">Ni podatkov</div>
    );
  }

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
    </main>
  );
}
