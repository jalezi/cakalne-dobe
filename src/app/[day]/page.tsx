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
import { desc, sql } from 'drizzle-orm';
import { jobs as jobsTable } from '@/db/schema';

type DatasetPageProps = {
  params: Promise<{ day: string }>;
};

export async function generateStaticParams() {
  const jobs = await db.query.jobs.findMany({
    columns: {},
    orderBy: [desc(jobsTable.startDate)],
    extras: {
      dateStyle: sql<string>`DATE(${jobsTable.startDate})`.as('date-style'),
    },
    limit: 5,
  });

  return jobs.map((job) => ({ params: { id: job.dateStyle } }));
}

export async function generateMetadata(props: DatasetPageProps) {
  const params = await props.params;
  const job = await db.query.jobs.findFirst({
    columns: { startDate: true },
    where: (job, operators) =>
      operators.eq(sql`DATE(${job.startDate})`, params.day),
  });

  const dateShort = job
    ? new Intl.DateTimeFormat('sl-SI', {
        dateStyle: 'short',
        timeZone: 'Europe/Ljubljana',
      }).format(new Date(job.startDate))
    : null;

  const dateLong = job
    ? new Intl.DateTimeFormat('sl-SI', {
        dateStyle: 'long',
        timeStyle: 'long',
        timeZone: 'Europe/Ljubljana',
      }).format(new Date(job.startDate))
    : null;

  return {
    title: 'Povprečja',
    description: `Povprečja čakalnih dob za postopke na dan: ${dateShort ?? ''}. Podatki pridobljeni: ${dateLong}.`,
  };
}

export default async function DatasetPage(props: DatasetPageProps) {
  const params = await props.params;
  const job = await db.query.jobs.findFirst({
    where: (job, operators) =>
      operators.eq(sql`DATE(${job.startDate})`, params.day),
    columns: { gitLabJobId: true, startDate: true, id: true },
  });

  if (!job) {
    return notFound();
  }

  const formattedDate = format(new Date(job.startDate), 'yyyy-MM-dd-HH-mm-ss');

  const fileName = `wp-${formattedDate}-${job.gitLabJobId}`;

  return (
    <main className="space-y-2 p-4">
      <Suspense fallback={<JobsPaginationSkeleton />}>
        <JobsPagination id={params.day} />
      </Suspense>
      <h1
        id="attr-h1"
        className="sr-only"
        aria-labelledby="attr-h1 attr-dataset-date attr-data-fetched-on"
      >
        Čakalne dobe
      </h1>
      <p id="attr-dataset-date">
        Nabor podatkov na dan: <Time date={job.startDate} />
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p id="attr-data-fetched-on" className="text-sm">
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
        <ProcedureAvgWTTable dbJobId={job.id} day={params.day} />
      </Suspense>
    </main>
  );
}
