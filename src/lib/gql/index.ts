import { GraphQLClient, gql } from 'graphql-request';
import { z } from 'zod';

export const GIT_LAB_GRAPHQL_API_URL = 'https://gitlab.com/api/graphql';

export const PROJECT_FULL_PATH = 'mitar/cakalne-dobe' as const;
export const PROJECT_JOB_STATUSES = ['SUCCESS'] as const;
export const JOB_NAME = 'run' as const;

export const projectJobsQueryVariablesSchema = z.object({
  first: z.number().nullish(),
  after: z.string().nullish(),
  fullPath: z.string(),
  statuses: z.array(z.enum(['SUCCESS'])),
});

const jobSchema = z.object({
  name: z.string(),
  finishedAt: z.string(),
  detailedStatus: z.object({
    detailsPath: z.string(),
  }),
});

const projectJobsSchema = z.object({
  project: z.object({
    jobs: z.object({
      pageInfo: z.object({
        endCursor: z.string(),
        hasNextPage: z.boolean(),
        hasPreviousPage: z.boolean(),
        startCursor: z.string(),
      }),
      count: z.number(),
      nodes: z.array(jobSchema),
    }),
  }),
});

export type ProjectJobs = z.infer<typeof projectJobsSchema>;

export const projectJobsQuery = gql`
  query getJobs(
    $fullPath: ID!
    $after: String
    $first: Int = 30
    $statuses: [CiJobStatus!]
  ) {
    project(fullPath: $fullPath) {
      jobs(after: $after, first: $first, statuses: $statuses) {
        pageInfo {
          endCursor
          hasNextPage
          hasPreviousPage
          startCursor
        }
        count
        nodes {
          name
          finishedAt
          detailedStatus {
            detailsPath
          }
        }
      }
    }
  }
`;

export const requiredVars = {
  fullPath: PROJECT_FULL_PATH,
  statuses: PROJECT_JOB_STATUSES,
};
export const graphQLClient = new GraphQLClient(GIT_LAB_GRAPHQL_API_URL);
