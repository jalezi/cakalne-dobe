import type { GetLatestGitLabJobId } from '@/app/api/v1/get-latest-gitlab-job-id/route';
import { getJobs } from './get-jobs';

export async function getLastJobId(
  first: number,
  after?: string | undefined
): Promise<GetLatestGitLabJobId> {
  const response = await getJobs({
    first,
    after,
  });

  if (!response.success) {
    return {
      success: false,
      error: response.error,
      meta: { params: { first, after } },
    };
  }

  const { nodes, pageInfo } = response.data.jobs;

  const job = nodes.find((job) => job.name === 'run');

  const meta = {
    params: {
      first,
      after,
    },
    nodes: nodes.length,
    pageInfo,
  };

  if (!job) {
    return {
      success: false,
      error: 'No job found',
      meta,
    };
  }

  const { detailsPath } = job.detailedStatus;
  const gitLabJobId = detailsPath.split('/').pop();

  if (!gitLabJobId) {
    return {
      success: false,
      error: 'GitLab job ID is missing',
      meta,
    };
  }

  return {
    success: true,
    data: {
      gitLabJobId,
      jobFinishedAt: job.finishedAt,
    },
    meta,
  };
}
