import { Suspense } from 'react';

import { Table } from '@/components/table';
import { JOB_NAME } from '@/lib/gql';
import { SelectDataset } from '@/components/select-dataset';
import { getJobs } from '@/utils/get-jobs';
import { Time } from '@/components/time';
import { notFound } from 'next/navigation';
import { type SelectOption } from '@/components/combo-box-responsive';

export default async function Home({
  params: { id },
}: {
  params: { id: string };
}) {
  const project = await getJobs();

  const jobsOptions: SelectOption[] = [];
  for (const job of project.jobs.nodes) {
    if (job.name !== JOB_NAME) continue;

    const value = job.detailedStatus.detailsPath.split('/').pop();
    if (!value) continue;
    const label = job.finishedAt;

    jobsOptions.push({ value, label });
  }

  const hasOptions = jobsOptions && jobsOptions?.length > 0;

  const foundJob = jobsOptions?.find((job) => job.value === id);

  if (!foundJob) {
    return notFound();
  }

  return (
    <main className="space-y-2 p-4">
      <div className="mb-4 space-y-2">
        {hasOptions ? (
          <>
            <SelectDataset jobsOptions={jobsOptions} selectedJob={foundJob} />
          </>
        ) : null}
        <p>
          Podatki pridobljeni: <Time time={foundJob.label} />
        </p>
      </div>
      <Suspense fallback={<div>Še malo...</div>}>
        <Table jsonId={foundJob.value} />
      </Suspense>
    </main>
  );
}
