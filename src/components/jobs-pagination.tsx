import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { JobLink } from './job-link';
import { cn } from '@/lib/utils';
import { Time } from './time';
import { desc, sql } from 'drizzle-orm';
import { db } from '@/db';
import { jobs as jobsTable } from '@/db/schema';

interface JobsPaginationProps {
  id: string;
  procedureCode?: string;
}

export async function JobsPagination({
  id,
  procedureCode,
}: JobsPaginationProps) {
  const jobs = await db.query.jobs.findMany({
    columns: { startDate: true },
    extras: {
      dateStyle: sql<string>`DATE(${jobsTable.startDate})`.as('date-style'),
    },
    orderBy: [desc(jobsTable.startDate)],
  });

  const jobIndex = jobs.findIndex((job) => job.dateStyle === id);

  if (jobIndex === -1) {
    return null;
  }

  const pCode = procedureCode ? procedureCode : '';

  const previousJob = jobIndex > 0 ? jobs[jobIndex - 1] : null;
  const previousJobDate = previousJob ? new Date(previousJob.startDate) : null;
  const prevHref = previousJob ? `/${previousJob.dateStyle}/${pCode}` : null;
  const nextJob = jobIndex < jobs.length - 1 ? jobs[jobIndex + 1] : null;
  const nextJobDate = nextJob ? new Date(nextJob.startDate) : null;
  const nextHref = nextJob ? `/${nextJob.dateStyle}/${pCode}` : null;

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
            {prevHref ? (
              <JobLink href={prevHref}>
                <ChevronLeft size={16} />
              </JobLink>
            ) : null}
          </Button>
          <Button
            asChild
            variant="link"
            className={cn(!nextJob && 'hidden', 'hidden pl-0 sm:inline-flex')}
          >
            {prevHref ? (
              <JobLink href={prevHref}>
                <ChevronLeft size={16} />
                {previousJobDate ? <Time date={previousJobDate} /> : null}
              </JobLink>
            ) : null}
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
            {nextHref ? (
              <JobLink href={nextHref}>
                <ChevronRight size={16} />
              </JobLink>
            ) : null}
          </Button>
          <Button
            asChild
            variant="link"
            className={cn(
              !nextJob && 'hidden',
              'ml-auto hidden pr-0 sm:inline-flex'
            )}
          >
            {nextHref ? (
              <JobLink href={nextHref}>
                {nextJobDate ? <Time date={nextJobDate} /> : null}
                <ChevronRight size={16} />
              </JobLink>
            ) : null}
          </Button>
        </>
      ) : null}
    </div>
  );
}
