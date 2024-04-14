import { JOB_NAME } from '@/lib/gql';
import { getJobs } from '@/utils/get-jobs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Time, TimeRange } from '@/components/time';

// This is the same as in next.config.ts, but somehow if set only in config it works only on deployed (Vercel) version and not when build and start locally
export const revalidate = 60; // 1 minute

export default async function Home() {
  const project = await getJobs();

  const jobs = project?.jobs.nodes.filter((job) => job.name === JOB_NAME) ?? [];

  const toDate = jobs[0]?.finishedAt;
  const formDate = jobs.at(-1)?.finishedAt;
  const haveDates = toDate && formDate;

  const jobsOptions = jobs
    .filter((job) => job.name === JOB_NAME)
    .map((job) => ({
      value: job.detailedStatus.detailsPath.split('/').pop() ?? 'unknown',
      label: job.finishedAt,
    }));

  return (
    <main className="space-y-2 p-4">
      <h1 id="attr-h1" className="text-2xl font-bold" aria-labelledby="attr-h1">
        Čakalne dobe
      </h1>
      {haveDates ? (
        <div className="mb-4 space-y-2">
          <p id="attr-data-fetched-on">
            za obdobje: <TimeRange startDate={formDate} endDate={toDate} />
          </p>
        </div>
      ) : null}
      <nav className="px-4 py-2">
        <ul>
          {jobsOptions.map((job) => (
            <li key={job.value}>
              <Button asChild variant="link" className="px-0">
                <Link href={`/${job.value}`}>
                  <Time
                    date={job.label}
                    options={{
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric',
                      second: 'numeric',
                    }}
                  />
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
