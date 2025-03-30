import { db } from '@/db';
import { jobs as jobsTable } from '@/db/schema';
import { TimeRange } from '@/components/time';
import { desc, asc } from 'drizzle-orm';

export default async function Home() {
  // Query for the first job (earliest date)
  const firstJobResult = await db.query.jobs.findMany({
    columns: { id: true, startDate: true },
    orderBy: [asc(jobsTable.startDate)],
    limit: 1,
  });
  const firstJob = firstJobResult[0];

  // Query for the last job (latest date)
  const lastJobResult = await db.query.jobs.findMany({
    columns: { id: true, startDate: true },
    orderBy: [desc(jobsTable.startDate)],
    limit: 1,
  });
  const lastJob = lastJobResult[0];

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
    </main>
  );
}
