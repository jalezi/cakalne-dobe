import { Suspense } from 'react';

import { Table } from '@/components/table';
import {
  type ProjectJobs,
  graphQLClient,
  projectJobsQuery,
  requiredVars,
  JOB_NAME,
} from '@/lib/gql';

export default async function Home({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  let project: ProjectJobs['project'] | undefined;
  try {
    const response = await graphQLClient.request<ProjectJobs>(
      projectJobsQuery,
      {
        ...requiredVars,
        first: 100,
      }
    );

    project = response.project;
  } catch (error) {
    console.error(error);
  }

  const jobsOptions = project?.jobs.nodes
    .filter((job) => job.name === JOB_NAME)
    .map((job) => ({
      value: job.detailedStatus.detailsPath.split('/').pop(),
      label: job.finishedAt,
    }));

  const foundJob = jobsOptions?.find((job) => job.value === searchParams.job);

  const selectedJob = foundJob ?? jobsOptions?.[0];

  const startDate = selectedJob?.label ? new Date(selectedJob?.label) : null;
  const formatedStartDate =
    startDate &&
    Intl.DateTimeFormat('sl-SI', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    }).format(startDate);

  return (
    <main className="space-y-2 p-4">
      <p>
        Podatki pridobljeni:{' '}
        {startDate ? (
          <time dateTime={startDate.toLocaleString()}>{formatedStartDate}</time>
        ) : (
          'ni podatka'
        )}
      </p>
      <Suspense fallback={<div>Še malo...</div>}>
        {selectedJob?.value ? (
          <Table jsonId={selectedJob.value} />
        ) : (
          <div>žal ni podatka</div>
        )}
      </Suspense>
    </main>
  );
}
