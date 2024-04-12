import {
  type ProjectJobs,
  graphQLClient,
  projectJobsQuery,
  requiredVars,
} from '@/lib/gql';

type JobsArgs = { first?: number; after?: string };

export const getJobs = async (options?: JobsArgs) => {
  const mergedOptions = {
    first: 100,
    after: undefined,
    ...options,
  };

  try {
    const response = await graphQLClient.request<ProjectJobs>(
      projectJobsQuery,
      {
        ...requiredVars,
        ...mergedOptions,
      }
    );

    return response.project;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to fetch jobs');
  }
};

export const getJob = async (id: string) => {
  let job: ProjectJobs['project']['jobs']['nodes'][0] | undefined;
  let continueFetching = true;
  let after: string | undefined;
  try {
    while (continueFetching) {
      const { jobs } = await getJobs({
        first: 1000, // this is maximum number of jobs we can fetch at once (not quite sure)
        after,
      });

      job = jobs.nodes.find(
        (jobNode) => jobNode.detailedStatus.detailsPath.split('/').pop() === id
      );

      continueFetching = jobs.pageInfo.hasNextPage && !job;
      after = jobs.pageInfo.endCursor;
    }
    return job;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to fetch job');
  }
};
