import Link from 'next/link';
import { ThemeToggler } from './theme-toggler';
import { getJobs } from '@/utils/get-jobs';
import { type SelectOption } from './combo-box-responsive';
import { JOB_NAME } from '@/lib/gql';
import { SelectDataset } from './select-dataset';

export async function Header({ id }: { id?: string }) {
  const project = await getJobs();
  const jobsOptions: SelectOption[] = [];
  for (const job of project.jobs.nodes) {
    if (job.name !== JOB_NAME) continue;

    const value = job.detailedStatus.detailsPath.split('/').pop();
    if (!value) continue;
    const label = job.finishedAt;

    jobsOptions.push({ value: `/${value}`, label });
  }

  const selectedJob = jobsOptions.find((job) => job.value === `/${id}`);

  return (
    <header className="flex items-center justify-between p-4">
      <Link href="/">
        <h1>Čakalne dobe</h1>
      </Link>
      <SelectDataset jobsOptions={jobsOptions} selectedJob={selectedJob} />
      <ThemeToggler />
    </header>
  );
}
