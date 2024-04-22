import { DateRangeJobLinks } from '@/components/date-range-job-links';
import { db } from '@/db';
import { desc } from 'drizzle-orm';
import { jobs as jobsTable } from '@/db/schema';
import { TimeRange } from '@/components/time';

export default async function Home() {
  const jobs = await db.query.jobs.findMany({
    columns: { id: true, startDate: true },
    orderBy: [desc(jobsTable.startDate)],
  });

  const jobsOptions = jobs.map((job) => ({
    value: job.id,
    label: job.startDate,
  }));

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
      <h2 className="text-xl font-bold">Povezave do čakalnih dob</h2>
      <DateRangeJobLinks links={jobsOptions} />
    </main>
  );
}
