import { Suspense } from 'react';

import { Table } from '@/components/table';
import { JOB_NAME } from '@/lib/gql';
import { getJobs } from '@/utils/get-jobs';
import { notFound } from 'next/navigation';
import { Time } from '@/components/time';

export const revalidate = 0; // json file is over 2MB, nextjs can not cache it

export default async function Home({
  params: { id },
}: {
  params: { id: string };
}) {
  const project = await getJobs();
  const foundJob = project.jobs.nodes.find((job) => job.name === JOB_NAME);

  if (!foundJob) {
    return notFound();
  }

  return (
    <main className="space-y-2 p-4">
      <h1
        id="attr-h1"
        className="text-2xl font-bold"
        aria-labelledby="attr-h1 attr-data-fetched-on"
      >
        Čakalne dobe
      </h1>
      <div className="mb-4 space-y-2">
        <p id="attr-data-fetched-on">
          Podatki pridobljeni:{' '}
          <Time
            date={foundJob.finishedAt}
            options={{
              year: '2-digit',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            }}
          />
        </p>
      </div>
      <Suspense fallback={<div>Še malo...</div>}>
        <Table jsonId={id} />
      </Suspense>
    </main>
  );
}
