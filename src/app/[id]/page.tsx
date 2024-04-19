import { Suspense } from 'react';

import { Table } from '@/components/table';
import { notFound } from 'next/navigation';
import { Time } from '@/components/time';
import { DataTableSkeleton } from '@/components/skeleton/data-table';

import { JobsPagination } from '@/components/jobs-pagination';
import { JobsPaginationSkeleton } from '@/components/skeleton/jobs-pagination';

import { JsonDropDownMenu } from '@/components/json-dropdown-menu';
import { db } from '@/db';

const SEARCH_PARAMS = {
  procedureCode: 'procedureCode',
} as const;

type HomeProps = {
  params: { id: string };
  searchParams: Record<string, string>;
};

export const revalidate = 0; // json file is over 2MB, nextjs can not cache it

export default async function Home({
  params: { id },
  searchParams,
}: HomeProps) {
  const urlSearchParams = new URLSearchParams(searchParams);
  const procedureCode = urlSearchParams.get(SEARCH_PARAMS.procedureCode);

  const job = await db.query.jobs.findFirst({
    where: (job, operators) => operators.eq(job.id, id),
    columns: { gitLabJobId: true, startDate: true, id: true },
  });

  if (!job) {
    return notFound();
  }

  const fileName = `wp-${job.startDate}-${job.gitLabJobId}`;

  return (
    <main className="space-y-2 p-4">
      <h1
        id="attr-h1"
        className="text-2xl font-bold"
        aria-labelledby="attr-h1 attr-data-fetched-on"
      >
        Čakalne dobe
      </h1>
      <Suspense fallback={<JobsPaginationSkeleton />}>
        <JobsPagination id={id} />
      </Suspense>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p id="attr-data-fetched-on">
          Podatki pridobljeni:{' '}
          <Time
            date={job.startDate}
            options={{
              year: '2-digit',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              timeZone: 'Europe/Ljubljana',
            }}
          />
        </p>
        <JsonDropDownMenu gitLabJobId={job.gitLabJobId} fileName={fileName} />
      </div>
      <Suspense fallback={<DataTableSkeleton />}>
        <Table procedureCode={procedureCode} dbJobId={job.id} />
      </Suspense>
    </main>
  );
}
