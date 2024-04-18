import { DateRangeJobLinks } from '@/components/date-range-job-links';
import { db } from '@/db';
import { desc } from 'drizzle-orm';
import { jobs as jobsTable } from '@/db/schema';

// This is the same as in next.config.ts, but somehow if set only in config it works only on deployed (Vercel) version and not when build and start locally
export const revalidate = 60; // 1 minute

export default async function Home() {
  const jobs = await db.query.jobs.findMany({
    columns: { id: true, startDate: true },
    orderBy: [desc(jobsTable.startDate)],
  });

  const jobsOptions = jobs.map((job) => ({
    value: job.id,
    label: job.startDate,
  }));

  return (
    <main className="z-0 space-y-2 p-4">
      <h1 id="attr-h1" className="text-2xl font-bold" aria-labelledby="attr-h1">
        Čakalne dobe
      </h1>
      <DateRangeJobLinks links={jobsOptions} />
    </main>
  );
}
