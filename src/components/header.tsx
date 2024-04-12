import Link from 'next/link';
import { ThemeToggler } from './theme-toggler';
import { getJobs } from '@/utils/get-jobs';
import { type SelectOption } from './combo-box-responsive';
import { JOB_NAME } from '@/lib/gql';
import { SelectDataset } from './select-dataset';
import { Button } from './ui/button';

export async function Header({ id }: { id?: string }) {
  const project = await getJobs();
  const jobsOptions: SelectOption[] = [];
  for (const job of project.jobs.nodes) {
    if (job.name !== JOB_NAME) continue;

    const value = job.detailedStatus.detailsPath.split('/').pop();
    if (!value) continue;
    const label = job.finishedAt;

    jobsOptions.push({
      value: `/${value}`,
      label: Intl.DateTimeFormat('sl-SI', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }).format(new Date(label)),
    });
  }

  const selectedJob = jobsOptions.find((job) => job.value === `/${id}`);

  return (
    <header className="sticky left-0 top-0 z-50 flex items-center bg-inherit p-4">
      <Button asChild variant="link" className="px-0">
        <Link href="/">Domov</Link>
      </Button>
      <div className="ml-auto flex items-center">
        <SelectDataset jobsOptions={jobsOptions} selectedJob={selectedJob} />
        <ThemeToggler className="ml-2" />
      </div>
    </header>
  );
}
