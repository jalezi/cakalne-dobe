import { JOB_NAME } from '@/lib/gql';
import { getJobs } from '@/utils/get-jobs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function Home() {
  const project = await getJobs();

  const jobsOptions = project?.jobs.nodes
    .filter((job) => job.name === JOB_NAME)
    .map((job) => ({
      value: job.detailedStatus.detailsPath.split('/').pop() ?? 'unknown',
      label: job.finishedAt,
    }));

  return (
    <main className="space-y-2 p-4">
      <nav>
        <ul>
          {jobsOptions.map((job) => (
            <li key={job.value}>
              <Button asChild variant="link">
                <Link href={`/${job.value}`}>{job.label}</Link>
              </Button>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
