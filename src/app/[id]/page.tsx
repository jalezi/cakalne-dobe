import { format } from 'date-fns';

import { notFound } from 'next/navigation';
import { Time } from '@/components/time';

import { JsonDropDownMenu } from '@/components/json-dropdown-menu';
import { db } from '@/db';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ProceduresPicker } from '@/components/procedures-picker';

type DatasetPageProps = {
  params: { id: string };
};

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

  const procedures = await db.query.procedures.findMany({
    orderBy: (procedure, operators) => operators.asc(procedure.code),
    columns: {
      code: true,
      name: true,
    },
  });

  return (
    <main className="space-y-2 p-4">
      <h1
        id="attr-h1"
        className="text-2xl font-bold"
        aria-labelledby="attr-h1 attr-data-fetched-on"
      >
        Čakalne dobe
      </h1>

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
          options={procedures.map((procedure) => ({
            value: `/${params.id}/${procedure.code}`,
            label: `${procedure.code} - ${procedure.name}`,
          }))}
        />
      </Suspense>
    </main>
  );
}
