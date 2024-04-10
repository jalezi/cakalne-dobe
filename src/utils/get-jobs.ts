import { cache } from 'react';
import 'server-only';

import {
  type ProjectJobs,
  graphQLClient,
  projectJobsQuery,
  requiredVars,
} from '@/lib/gql';

export const preload = () => {
  void getJobs();
};

export const getJobs = cache(async () => {
  try {
    const response = await graphQLClient.request<ProjectJobs>(
      projectJobsQuery,
      {
        ...requiredVars,
        first: 100,
      }
    );

    return response.project;
  } catch (error) {
    throw new Error('Failed to fetch jobs');
  }
});
