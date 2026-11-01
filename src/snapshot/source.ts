import type { ZodIssue } from 'zod';
import {
  GIT_LAB_GRAPHQL_API_URL,
  JOB_NAME,
  projectJobsQuery,
  projectJobsSchema,
  requiredVars,
} from '@/lib/gql';
import { type AllData, allDataSchema } from '@/lib/zod-schemas/data-schemas';
import type { Result } from '@/types';

const BASE_JOBS_URL =
  'https://wayback-automachine.gitlab.io/-/cakalne-dobe/-/jobs';

export const GITLAB_SOURCE_ERRORS = {
  JOBS_FETCH_FAILED: 'JOBS_FETCH_FAILED',
  NO_RUN_JOB: 'NO_RUN_JOB',
  FETCH_FAILED: 'FETCH_FAILED',
  SNAPSHOT_INVALID: 'SNAPSHOT_INVALID',
} as const;

export type GitLabSourceMeta = { issues?: ZodIssue[] };

type GitLabJob = { name: string; gitLabJobId: string };

/** The source project on GitLab: its job list (ADR-0001) and each Job's Snapshot */
export type GitLabSource = {
  /** The newest successful `run` job among the latest 10 */
  latestRunJob(): Promise<Result<{ gitLabJobId: string }>>;
  fetchSnapshot(
    gitLabJobId: string
  ): Promise<Result<AllData, GitLabSourceMeta>>;
};

const LATEST_JOBS_COUNT = 10;

// The job list is newest first
function pickLatestRunJob(jobs: GitLabJob[]): Result<{ gitLabJobId: string }> {
  const job = jobs.find(({ name }) => name === JOB_NAME);
  if (!job) {
    return {
      success: false,
      error: {
        code: GITLAB_SOURCE_ERRORS.NO_RUN_JOB,
        message: `No successful ${JOB_NAME} job among the latest ${LATEST_JOBS_COUNT} jobs`,
      },
    };
  }
  return { success: true, data: { gitLabJobId: job.gitLabJobId } };
}

const jobsFetchFailed = (message: string) =>
  ({
    success: false,
    error: { code: GITLAB_SOURCE_ERRORS.JOBS_FETCH_FAILED, message },
  }) as const;

export const snapshotUrl = (gitLabJobId: string) =>
  `${BASE_JOBS_URL}/${gitLabJobId}/artifacts/out.json`;

export function createHttpGitLabSource(
  fetchImpl: typeof fetch = fetch
): GitLabSource {
  return {
    async latestRunJob() {
      let res: Response;
      try {
        res = await fetchImpl(GIT_LAB_GRAPHQL_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: projectJobsQuery,
            variables: { ...requiredVars, first: LATEST_JOBS_COUNT },
          }),
        });
      } catch (error) {
        return jobsFetchFailed(
          `Failed to fetch the GitLab job list: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      if (!res.ok) {
        return jobsFetchFailed(
          `Failed to fetch the GitLab job list: ${res.status} ${res.statusText}`
        );
      }

      // A GraphQL error comes back with `data` null, so it fails the schema too
      const body = (await res.json().catch(() => null)) as {
        data?: unknown;
      } | null;
      const parsed = projectJobsSchema.safeParse(body?.data);
      if (!parsed.success) {
        return jobsFetchFailed('Invalid GitLab job list response');
      }

      return pickLatestRunJob(
        parsed.data.project.jobs.nodes.map((job) => ({
          name: job.name,
          gitLabJobId: job.detailedStatus.detailsPath.split('/').pop() ?? '',
        }))
      );
    },

    async fetchSnapshot(gitLabJobId: string) {
      const res = await fetchImpl(snapshotUrl(gitLabJobId));

      if (!res.ok) {
        return {
          success: false,
          error: {
            code: GITLAB_SOURCE_ERRORS.FETCH_FAILED,
            message: `Failed to fetch snapshot for job ${gitLabJobId}: ${res.status} ${res.statusText}`,
          },
        };
      }

      const raw = await res.json();
      const parsed = allDataSchema.safeParse(raw);

      if (!parsed.success) {
        return {
          success: false,
          error: {
            code: GITLAB_SOURCE_ERRORS.SNAPSHOT_INVALID,
            message: `Invalid snapshot data for job ${gitLabJobId}`,
          },
          meta: { issues: parsed.error.issues },
        };
      }

      return { success: true, data: parsed.data };
    },
  };
}

/**
 * A GitLab source with a fixed job list and fixed Snapshots, for tests.
 * @param jobs The job list, newest first; null makes the job list fail
 * @param snapshots Snapshots by GitLab job ID
 * @returns The source, with `fetched` listing each Snapshot asked for
 */
export function createInMemoryGitLabSource({
  jobs,
  snapshots,
}: {
  jobs: GitLabJob[] | null;
  snapshots: Record<string, AllData>;
}): GitLabSource & { fetched: string[] } {
  const fetched: string[] = [];
  return {
    fetched,
    async latestRunJob() {
      if (!jobs) {
        return jobsFetchFailed('In-memory job list fails');
      }
      return pickLatestRunJob(jobs);
    },
    async fetchSnapshot(gitLabJobId: string) {
      fetched.push(gitLabJobId);
      const snapshot = snapshots[gitLabJobId];

      if (!snapshot) {
        return {
          success: false,
          error: {
            code: GITLAB_SOURCE_ERRORS.FETCH_FAILED,
            message: `No in-memory snapshot found for job ${gitLabJobId}`,
          },
        };
      }

      return { success: true, data: snapshot };
    },
  };
}
