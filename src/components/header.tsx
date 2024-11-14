import Link from 'next/link';
import { ThemeToggler } from './theme-toggler';
import { type SelectOption } from './combo-box-responsive';
import { Button } from './ui/button';
import { db } from '@/db';
import { desc, sql } from 'drizzle-orm';
import { jobs as jobsTable } from '@/db/schema';
import { Suspense } from 'react';
import { Skeleton } from './ui/skeleton';
import { DatePickerDemo } from './job-picker';

export async function Header({ id }: { id?: string }) {
  const jobs = await db.query.jobs.findMany({
    extras: {
      dateStyle: sql<string>`DATE(${jobsTable.startDate})`.as('date-style'),
    },
    orderBy: [desc(jobsTable.startDate)],
  });

  const jobsOptions: SelectOption[] = [];
  for (const job of jobs) {
    const value = job.dateStyle;

    jobsOptions.push({
      value: `/${value}/`,
      label: job.dateStyle,
    });
  }

  return (
    <header className="sticky left-0 top-0 z-50 flex items-center bg-transparent p-4 backdrop-blur-lg">
      <Button asChild variant="link" className="px-0">
        <Link href="/" aria-current={id ? undefined : 'page'}>
          Domov
        </Link>
      </Button>
      <div className="ml-auto flex items-center">
        <Suspense fallback={<Skeleton className="h-10 w-40" />}>
          <DatePickerDemo jobsOptions={jobsOptions} />
        </Suspense>
        <ThemeToggler className="ml-2 aspect-square" />
      </div>
    </header>
  );
}
