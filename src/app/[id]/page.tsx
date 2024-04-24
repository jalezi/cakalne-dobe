import { format } from 'date-fns';

import { notFound } from 'next/navigation';
import { Time } from '@/components/time';

import { JsonDropDownMenu } from '@/components/json-dropdown-menu';
import { db } from '@/db';
import { Suspense } from 'react';
import { ProcedureAvgWTTable } from '@/components/tables/procedure-avg-wt/procedure-avg-wt';
import { DataTableSkeleton } from '@/components/skeleton/data-table';
import { JobsPaginationSkeleton } from '@/components/skeleton/jobs-pagination';
import { JobsPagination } from '@/components/jobs-pagination';

type DatasetPageProps = {
  params: { id: string };
};

export async function generateStaticParams() {
  const jobs = await db.query.jobs.findMany({
    columns: { id: true },
  });

  return jobs.map((job) => ({ params: { id: job.id } })).slice(0, 5);
}

export async function generateMetadata({ params }: DatasetPageProps) {
  const job = await db.query.jobs.findFirst({
    where: (job, operators) => operators.eq(job.id, params.id),
    columns: { startDate: true },
  });

  const date = job
    ? new Intl.DateTimeFormat('sl-SI', {
        dateStyle: 'short',
        timeZone: 'Europe/Ljubljana',
      }).format(new Date(job.startDate))
    : null;

  const dateText = date ? ` za: ${date}` : '';

  return {
    title: date,
    description: `Čakalne dobe na ${dateText}`,
  };
}

export default async function DatasetPage({ params }: DatasetPageProps) {
  const job = await db.query.jobs.findFirst({
    where: (job, operators) => operators.eq(job.id, params.id),
    columns: { gitLabJobId: true, startDate: true, id: true },
  });

  if (!job) {
    return notFound();
  }

  const formattedDate = format(new Date(job.startDate), 'yyyy-MM-dd-HH-mm-ss');

  const fileName = `wp-${formattedDate}-${job.gitLabJobId}`;

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
        <JobsPagination id={params.id} />
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
        <ProcedureAvgWTTable dbJobId={job.id} />
      </Suspense>
    </main>
  );
}
