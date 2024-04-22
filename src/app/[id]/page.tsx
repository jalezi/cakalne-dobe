import { Suspense } from 'react';

import { format } from 'date-fns';

import { Table } from '@/components/table';
import { notFound, redirect } from 'next/navigation';
import { Time } from '@/components/time';
import { DataTableSkeleton } from '@/components/skeleton/data-table';

import { JobsPagination } from '@/components/jobs-pagination';
import { JobsPaginationSkeleton } from '@/components/skeleton/jobs-pagination';

import { JsonDropDownMenu } from '@/components/json-dropdown-menu';
import { db } from '@/db';
import { ProceduresPicker } from '@/components/procedures-picker';
import { Skeleton } from '@/components/ui/skeleton';

const SEARCH_PARAMS = {
  procedureCode: 'procedureCode',
} as const;

type HomeProps = {
  params: { id: string };
  searchParams: Record<string, string>;
};

export async function generateMetadata({ params, searchParams }: HomeProps) {
  const job = await db.query.jobs.findFirst({
    where: (job, operators) => operators.eq(job.id, params.id),
    columns: { startDate: true },
  });

  const date = job
    ? new Intl.DateTimeFormat('sl-SI', {
        dateStyle: 'full',
        timeZone: 'Europe/Ljubljana',
      }).format(new Date(job.startDate))
    : null;

  const dateText = date ? ` za: ${date}` : '';

  const urlSearchParams = new URLSearchParams(searchParams);
  const procedureCodeSearchParam =
    urlSearchParams.get(SEARCH_PARAMS.procedureCode) ?? '';
  const foundProcedure =
    (await db.query.procedures.findFirst({
      where: (procedure, operators) =>
        operators.eq(procedure.code, procedureCodeSearchParam),
      columns: { name: true },
    })) ??
    (await db.query.procedures.findFirst({
      columns: { name: true },
      orderBy(fields, operators) {
        return operators.asc(fields.code);
      },
    }));

  return {
    title: `${foundProcedure?.name ?? 'Neznana procedura'}`, // ? possible too long title with too many dashes; procedure's name is long and sometimes contains dashes; title template is "Čakalne dobe - Sledilnik"
    description: `Čakalne dobe za ${foundProcedure?.name ?? 'neznano proceduro'}${dateText}`,
  };
}

export default async function Home({
  params: { id },
  searchParams,
}: HomeProps) {
  const urlSearchParams = new URLSearchParams(searchParams);
  const procedureCodeSearchParam =
    urlSearchParams.get(SEARCH_PARAMS.procedureCode) ?? '';

  const procedures = await db.query.procedures.findMany({
    columns: {
      code: true,
      name: true,
    },
    orderBy: (procedures, operators) => operators.asc(procedures.code),
  });

  const procedure =
    procedures.find(
      (procedure) => procedure.code === procedureCodeSearchParam
    ) ?? procedures[0];

  if (!procedure) {
    return notFound();
  }

  urlSearchParams.set(SEARCH_PARAMS.procedureCode, procedure.code);

  if (procedureCodeSearchParam !== procedure.code) {
    redirect(`/${id}?${urlSearchParams.toString()}`);
  }

  const job = await db.query.jobs.findFirst({
    where: (job, operators) => operators.eq(job.id, id),
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
      <h2>{procedure.name}</h2>
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
      <Suspense
        fallback={
          <div>
            <Skeleton className="h-10 w-full" />
          </div>
        }
      >
        <ProceduresPicker
          currentProcedureCode={procedure.code}
          procedures={procedures}
          pathname={`/${job.id}`}
          urlSearchParams={urlSearchParams}
        />
      </Suspense>
      <Suspense fallback={<DataTableSkeleton />}>
        <Table procedureCode={procedure.code} dbJobId={job.id} />
      </Suspense>
    </main>
  );
}
