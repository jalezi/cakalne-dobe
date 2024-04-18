import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { JobLink } from './job-link';
import { cn } from '@/lib/utils';
import { Time } from './time';
import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { jobs as jobsTable } from '@/db/schema';

interface JobsPaginationProps {
  id: string;
  procedureCode?: string;
}

export async function JobsPagination({ id }: JobsPaginationProps) {
  const jobs = await db.query.jobs.findMany({
    columns: { id: true, startDate: true },
    orderBy: [desc(jobsTable.startDate)],
  });
  const jobsOptions = jobs.map((job) => ({
    value: job.id,
    label: job.startDate,
  }));

  const jobIndex = jobsOptions.findIndex((job) => job.value === id);

  if (jobIndex === -1) {
    return null;
  }

  const previousJob = jobIndex > 0 ? jobsOptions[jobIndex - 1] : null;
  const previousJobDate = previousJob ? new Date(previousJob.label) : null;
  const nextJob =
    jobIndex < jobsOptions.length - 1 ? jobsOptions[jobIndex + 1] : null;
  const nextJobDate = nextJob ? new Date(nextJob.label) : null;

  return (
    <div className="flex">
      {previousJob ? (
        <>
          <Button
            asChild
            variant="secondary"
            size="icon"
            disabled={!!previousJob}
            className={cn(!previousJob && 'hidden', 'sm:hidden')}
            aria-label={
              previousJobDate
                ? `podatki pridobljeni: ${previousJobDate.toLocaleDateString()}`
                : 'neznan datum'
            }
          >
            <JobLink id={previousJob.value}>
              <ChevronLeft size={16} />
            </JobLink>
          </Button>
          <Button
            asChild
            variant="link"
            className={cn(!nextJob && 'hidden', 'hidden pl-0 sm:inline-flex')}
          >
            <JobLink id={previousJob.value}>
              <ChevronLeft size={16} />
              {previousJobDate ? <Time date={previousJobDate} /> : null}
            </JobLink>
          </Button>
        </>
      ) : null}
      {nextJob ? (
        <>
          <Button
            asChild
            variant="secondary"
            size="icon"
            disabled={!!nextJob}
            className={cn(!nextJob && 'hidden', 'ml-auto sm:hidden')}
            aria-label={
              nextJobDate
                ? `podatki pridobljeni: ${nextJobDate.toLocaleDateString()}`
                : 'neznan datum'
            }
          >
            <JobLink id={nextJob.value}>
              <ChevronRight size={16} />
            </JobLink>
          </Button>
          <Button
            asChild
            variant="link"
            className={cn(
              !nextJob && 'hidden',
              'ml-auto hidden pr-0 sm:inline-flex'
            )}
          >
            <JobLink id={nextJob.value}>
              {nextJobDate ? <Time date={nextJobDate} /> : null}
              <ChevronRight size={16} />
            </JobLink>
          </Button>
        </>
      ) : null}
    </div>
  );
}
