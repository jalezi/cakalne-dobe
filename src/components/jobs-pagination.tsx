import { JOB_NAME } from '@/lib/gql';
import { getJobs } from '@/utils/get-jobs';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { JobLink } from './job-link';
import { cn } from '@/lib/utils';

interface JobsPaginationProps {
  id: string;
  procedureCode?: string;
}

export async function JobsPagination({ id }: JobsPaginationProps) {
  const project = await getJobs();

  const jobs = project?.jobs.nodes.filter((job) => job.name === JOB_NAME) ?? [];
  const jobsOptions = jobs
    .filter((job) => job.name === JOB_NAME)
    .map((job) => ({
      value: job.detailedStatus.detailsPath.split('/').pop() ?? 'unknown',
      label: job.finishedAt,
    }));

  const jobIndex = jobsOptions.findIndex((job) => job.value === id);

  if (jobIndex === -1) {
    return null;
  }

  const nextJob = jobIndex > 0 ? jobsOptions[jobIndex - 1] : null;
  const previousJob =
    jobIndex < jobsOptions.length - 1 ? jobsOptions[jobIndex + 1] : null;

  return (
    <div className="flex">
      <Button
        asChild
        variant="secondary"
        size="icon"
        disabled={!!nextJob}
        className={cn(!nextJob && 'invisible')}
        aria-label={
          nextJob
            ? `podatki pridobljeni: ${new Date(nextJob.label).toLocaleString()}`
            : 'No previous job'
        }
      >
        {nextJob ? (
          <JobLink id={nextJob.value}>
            <ChevronLeft size={16} />
          </JobLink>
        ) : (
          <span>
            <ChevronLeft size={16} />
          </span>
        )}
      </Button>
      <Button
        asChild
        variant="secondary"
        size="icon"
        disabled={!!previousJob}
        className={cn(!previousJob && 'invisible', 'ml-auto')}
        aria-label={
          previousJob
            ? `podatki pridobljeni: ${new Date(previousJob.label).toLocaleString()}`
            : 'No previous job'
        }
      >
        {previousJob ? (
          <JobLink id={previousJob.value}>
            <ChevronRight size={16} />
          </JobLink>
        ) : (
          <span>
            <ChevronRight size={16} />
          </span>
        )}
      </Button>
    </div>
  );
}
