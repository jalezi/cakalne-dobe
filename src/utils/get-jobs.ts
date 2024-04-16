import {
  type ProjectJobs,
  graphQLClient,
  projectJobsQuery,
  requiredVars,
} from '@/lib/gql';
import { type FetchResponse } from '@/types';

type JobsArgs = { first?: number; after?: string };

export const getJobs = async (
  options?: JobsArgs
): Promise<FetchResponse<ProjectJobs['project'], string>> => {
  const mergedOptions = {
    first: 100,
    after: undefined,
    ...options,
  };

  graphQLClient.setHeader(
    'Cache-Control',
    'max-age=60, stale-while-revalidate=59'
  );

  try {
    const response = await graphQLClient.request<ProjectJobs>(
      projectJobsQuery,
      {
        ...requiredVars,
        ...mergedOptions,
      }
    );

    return { success: true, data: response.project };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to fetch jobs' };
  }
};

type Job = ProjectJobs['project']['jobs']['nodes'][0];

export const getJob = async (id: string): Promise<FetchResponse<Job>> => {
  let job: Job | undefined;
  let continueFetching = true;
  let after: string | undefined;
  try {
    while (continueFetching) {
      const response = await getJobs({
        first: 1000, // this is maximum number of jobs we can fetch at once (not quite sure)
        after,
      });

      if (response.success === false) {
        console.error(response.error);
        throw new Error('Failed to fetch job');
      }
      const jobs = response.data.jobs;

      job = jobs.nodes.find(
        (jobNode) => jobNode.detailedStatus.detailsPath.split('/').pop() === id
      );

      continueFetching = jobs.pageInfo.hasNextPage && !job;
      after = jobs.pageInfo.endCursor;
    }

    if (!job) {
      return { success: false, error: 'Job not found' };
    }

    return { success: true, data: job };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to fetch job' };
  }
};
