import { Suspense } from 'react';

import { Table } from '@/components/table';
import { getJob } from '@/utils/get-jobs';
import { notFound } from 'next/navigation';
import { Time } from '@/components/time';
import { DataTableSkeleton } from '@/components/skeleton/data-table';

type HomeProps = {
  params: { id: string };
};

export const revalidate = 0; // json file is over 2MB, nextjs can not cache it

export default async function Home({ params: { id } }: HomeProps) {
  const job = await getJob(id);
  if (!job) {
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
            date={job.finishedAt}
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
      <Suspense fallback={<DataTableSkeleton />}>
        <Table jsonId={id} />
      </Suspense>
    </main>
  );
}
