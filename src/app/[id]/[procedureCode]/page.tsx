import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { format } from 'date-fns';

import { JsonDropDownMenu } from '@/components/json-dropdown-menu';
import { ProceduresPicker } from '@/components/procedures-picker';
import { DataTableSkeleton } from '@/components/skeleton/data-table';
import { ProcedureWTTable } from '@/components/tables/procedure-wt/procedure-wt-table';
import { Time } from '@/components/time';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/db';
import { JobsPaginationSkeleton } from '@/components/skeleton/jobs-pagination';
import { JobsPagination } from '@/components/jobs-pagination';
import { jobs as jobsTable } from '@/db/schema';
import { desc, sql } from 'drizzle-orm';

type ProcedureCodePageProps = {
  params: Promise<{ id: string; procedureCode: string }>;
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

  const procedures = await db.query.procedures.findMany({
    columns: { code: true },
    orderBy: (procedure, operators) => operators.asc(procedure.code),
    limit: 5,
  });

  return jobs.flatMap((job) =>
    procedures.map((procedure) => ({
      params: { id: job.dateStyle, procedureCode: procedure.code },
    }))
  );
}

export async function generateMetadata(props: ProcedureCodePageProps) {
  const params = await props.params;
  const job = await db.query.jobs.findFirst({
    columns: { startDate: true },
    where: (job, operators) =>
      operators.eq(sql`DATE(${job.startDate})`, params.id),
  });

  if (!job) {
    return notFound();
  }

  const date = job
    ? new Intl.DateTimeFormat('sl-SI', {
        dateStyle: 'long',
        timeZone: 'Europe/Ljubljana',
      }).format(new Date(job.startDate))
    : null;

  const dateText = date ? ` za: ${date}` : '';

  const procedure = await db.query.procedures.findFirst({
    where: (procedure, operators) =>
      operators.eq(procedure.code, params.procedureCode),
    columns: {
      name: true,
      code: true,
    },
  });

  if (!procedure) {
    return notFound();
  }

  return {
    title: procedure.name,
    description: `Čakalne dobe za:${procedure.name}(${procedure.code}) na ${dateText}`,
  };
}

export default async function ProcedureCodePage(props: ProcedureCodePageProps) {
  const params = await props.params;
  const batchResponse = await db.batch([
    db.query.jobs.findFirst({
      where: (job, operators) =>
        operators.eq(sql`DATE(${job.startDate})`, params.id),
      columns: { gitLabJobId: true, startDate: true, id: true },
    }),

    db.query.procedures.findMany({
      orderBy: (procedure, operators) => operators.asc(procedure.code),
      columns: {
        code: true,
        name: true,
      },
    }),
  ]);

  const [job, procedures] = batchResponse;
  const procedure = procedures.find(
    (procedure) => procedure.code === params.procedureCode
  );

  if (!job || !procedure) {
    return notFound();
  }

  const formattedDate = format(new Date(job.startDate), 'yyyy-MM-dd-HH-mm-ss');

  const fileName = `wp-${formattedDate}-${job.gitLabJobId}`;
  return (
    <main className="space-y-2 p-4">
      <Suspense fallback={<JobsPaginationSkeleton />}>
        <JobsPagination id={params.id} procedureCode={procedure.code} />
      </Suspense>
      <h1
        id="attr-h1"
        className="sr-only"
        aria-labelledby="attr-h1 attr-dataset-date attr-procedure attr-data-fetched-on"
      >
        Čakalne dobe
      </h1>
      <p id="attr-dataset-date">
        Nabor podatkov na dan: <Time date={job.startDate} />
        <span className="sr-only">za</span>
      </p>
      <Suspense
        fallback={
          <div>
            <Skeleton className="h-10 w-full" />
          </div>
        }
      >
        <ProceduresPicker
          id="attr-procedure"
          options={procedures.map((procedure) => ({
            value: `/${params.id}/${procedure.code}/`,
            label: `${procedure.code} - ${procedure.name}`,
          }))}
          defaultSelected={{
            value: `/${params.id}/${procedure.code}/`,
            label: `${procedure.code} - ${procedure.name}`,
          }}
        />
      </Suspense>

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
        <ProcedureWTTable procedureCode={procedure.code} dbJobId={job.id} />
      </Suspense>
    </main>
  );
}
