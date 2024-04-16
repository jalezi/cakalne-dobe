import { JOB_NAME } from '@/lib/gql';
import { getJobs } from '@/utils/get-jobs';

import { DateRangeJobLinks } from '@/components/date-range-job-links';

// This is the same as in next.config.ts, but somehow if set only in config it works only on deployed (Vercel) version and not when build and start locally
export const revalidate = 60; // 1 minute

export default async function Home() {
  const response = await getJobs();

  if (response.success === false) {
    throw new Error(response.error);
  }

  const project = response.data;

  const jobs = project?.jobs.nodes.filter((job) => job.name === JOB_NAME) ?? [];

  const jobsOptions = jobs
    .filter((job) => job.name === JOB_NAME)
    .map((job) => ({
      value: job.detailedStatus.detailsPath.split('/').pop() ?? 'unknown',
      label: job.finishedAt,
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
