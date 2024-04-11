import { Suspense } from 'react';

import { Table } from '@/components/table';
import { JOB_NAME } from '@/lib/gql';
import { getJobs } from '@/utils/get-jobs';
import { notFound } from 'next/navigation';

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
      <Suspense fallback={<div>Še malo...</div>}>
        <Table jsonId={id} />
      </Suspense>
    </main>
  );
}
