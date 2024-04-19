import Link from 'next/link';
import { ThemeToggler } from './theme-toggler';
import { type SelectOption } from './combo-box-responsive';
import { SelectDataset } from './select-dataset';
import { Button } from './ui/button';
import { db } from '@/db';
import { desc } from 'drizzle-orm';
import { jobs as jobsTable } from '@/db/schema';
import { Suspense } from 'react';
import { Skeleton } from './ui/skeleton';

export async function Header({ id }: { id?: string }) {
  const jobs = await db.query.jobs.findMany({
    columns: { id: true, startDate: true },
    orderBy: [desc(jobsTable.startDate)],
  });

  const jobsOptions: SelectOption[] = [];
  for (const job of jobs) {
    const value = job.id;

    jobsOptions.push({
      value: `/${value}`,
      label: Intl.DateTimeFormat('sl-SI', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }).format(new Date(job.startDate)),
    });
  }

  const selectedJob = jobsOptions.find((job) => job.value === `/${id}`);

  return (
    <header className="sticky left-0 top-0 z-50 flex items-center bg-transparent p-4 backdrop-blur-lg">
      <Button asChild variant="link" className="px-0">
        <Link href="/">Domov</Link>
      </Button>
      <div className="ml-auto flex items-center">
        <Suspense fallback={<Skeleton className="h-10 w-40" />}>
          <SelectDataset jobsOptions={jobsOptions} selectedJob={selectedJob} />
        </Suspense>
        <ThemeToggler className="ml-2 aspect-square" />
      </div>
    </header>
  );
}
