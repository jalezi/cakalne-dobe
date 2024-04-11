import { JOB_NAME } from '@/lib/gql';
import { SelectDataset } from '@/components/select-dataset';
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
  const hasOptions = jobsOptions && jobsOptions?.length > 0;

  return (
    <main className="space-y-2 p-4">
      <div className="mb-4 space-y-2">
        {hasOptions ? (
          <>
            <SelectDataset
              jobsOptions={jobsOptions}
              selectedJob={jobsOptions[0]}
            />
          </>
        ) : null}
      </div>
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
