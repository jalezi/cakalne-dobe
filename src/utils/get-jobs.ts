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
