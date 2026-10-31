import {
  GIT_LAB_GRAPHQL_API_URL,
  type ProjectJobs,
  projectJobsQuery,
  requiredVars,
} from '@/lib/gql';
import { type FetchResponse } from '@/types';

type JobsArgs = { first?: number; after?: string };

type GraphQLResponseBody = { data: ProjectJobs; errors?: unknown[] };

export const getJobs = async (
  options?: JobsArgs
): Promise<FetchResponse<ProjectJobs['project'], string>> => {
  const mergedOptions = {
    first: 100,
    after: undefined,
    ...options,
  };

  try {
    const response = await fetch(GIT_LAB_GRAPHQL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=60, stale-while-revalidate=59',
      },
      body: JSON.stringify({
        query: projectJobsQuery,
        variables: {
          ...requiredVars,
          ...mergedOptions,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`GitLab GraphQL API responded with ${response.status}`);
    }

    const body = (await response.json()) as GraphQLResponseBody;

    if (body.errors?.length) {
      throw new Error(
        `GitLab GraphQL API errors: ${JSON.stringify(body.errors)}`
      );
    }

    return { success: true, data: body.data.project };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to fetch jobs' };
  }
};
