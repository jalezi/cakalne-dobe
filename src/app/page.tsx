import { Suspense } from 'react';

import { Table } from '@/components/table';
import { JOB_NAME } from '@/lib/gql';
import { SelectDataset } from '@/components/select-dataset';
import { getJobs, preload as getJobsPreload } from '@/utils/get-jobs';
import { preload as getJsonPreload } from '@/utils/get-json';

export default async function Home({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  getJobsPreload();
  const project = await getJobs();

  const jobsOptions = project?.jobs.nodes
    .filter((job) => job.name === JOB_NAME)
    .map((job) => ({
      value: job.detailedStatus.detailsPath.split('/').pop() ?? 'unknown',
      label: job.finishedAt,
    }));
  const hasOptions = jobsOptions && jobsOptions?.length > 0;

  const searchParamJob = searchParams.job;
  const foundJob = jobsOptions?.find((job) => job.value === searchParamJob);
  const noJob = !!searchParamJob && !foundJob;
  if (noJob) {
    console.error('Job not found:', searchParamJob);
  }

  const selectedJob = noJob
    ? { value: '', label: '' }
    : foundJob
      ? foundJob
      : jobsOptions?.[0];

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

  !noJob && getJsonPreload(selectedJob.value);

  return (
    <main className="space-y-2 p-4">
      <div className="mb-4 space-y-2">
        {hasOptions ? (
          <>
            <SelectDataset
              jobsOptions={jobsOptions}
              selectedJob={selectedJob}
            />
          </>
        ) : null}
        <p>
          Podatki pridobljeni:{' '}
          {startDate ? (
            <time dateTime={startDate.toLocaleString()}>
              {formatedStartDate}
            </time>
          ) : (
            'ni podatka'
          )}
        </p>
      </div>
      {noJob ? (
        <div>
          Dataset z id: <code>{searchParamJob}</code> ne obstaja.
        </div>
      ) : (
        <Suspense fallback={<div>Še malo...</div>}>
          {selectedJob?.value ? (
            <Table jsonId={selectedJob.value} />
          ) : (
            <div>Žal ni podatkov</div>
          )}
        </Suspense>
      )}
    </main>
  );
}
