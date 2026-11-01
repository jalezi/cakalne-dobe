import { format } from 'date-fns';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import type * as schema from '@/db/schema';
import { jobs as jobsTable } from '@/db/schema';
import { getLastJobId } from '@/utils/get-last-job-id';
import { handleError } from '@/utils/handle-error';
import type { ReturnType } from './types';

export const JOB_PROCESSING_ERRORS = {
  LATEST_JOB_CHECK_FAILED: 'LATEST_JOB_CHECK_FAILED',
  JOB_ALREADY_EXISTS: 'JOB_ALREADY_EXISTS',
  GITLAB_FETCH_FAILED: 'GITLAB_FETCH_FAILED',
  DB_QUERY_ERROR: 'DB_QUERY_ERROR',
} as const;

/**
 * Checks if the latest job should be inserted into the database.
 * @returns Result indicating whether the job should be inserted
 */
export async function shouldInsertLatestJob(): Promise<ReturnType<'ok'>> {
  const latestJobInDbResult = await getLatestJobInDb();

  if (!latestJobInDbResult.success) {
    return {
      success: false,
      error: {
        code: JOB_PROCESSING_ERRORS.LATEST_JOB_CHECK_FAILED,
        message: latestJobInDbResult.error.message,
      },
    };
  }

  if (latestJobInDbResult.data.isInDB) {
    return {
      success: false,
      error: {
        code: JOB_PROCESSING_ERRORS.JOB_ALREADY_EXISTS,
        message: 'Latest job already exists in the database',
      },
    };
  }

  return { success: true, data: 'ok' };
}

/**
 * Retrieves the latest job from the database if it exists based on the GitLab job ID.
 * First fetches last ten jobs from GitLab and checks if the job is already in the database.
 * If the job is found, it returns the job information.
 * If the job is not found, it returns an object indicating that the job is not in the database.
 * If an error occurs during the database query, it returns an error message.
 * @returns Object containing information about whether the job is already in the database
 */
export async function getLatestJobInDb(): Promise<
  ReturnType<{
    isInDB: boolean;
    gitLabJobId: string;
    date: string;
    job: schema.SelectJob | undefined;
  }>
> {
  const latestGitLabJobId = await getLastJobId(10);

  if (!latestGitLabJobId.success) {
    return {
      success: false,
      error: {
        code: JOB_PROCESSING_ERRORS.GITLAB_FETCH_FAILED,
        message: `Failed to get latest GitLab job ID: ${latestGitLabJobId.error}`,
      },
    };
  }

  const jobDate = format(latestGitLabJobId.data.jobFinishedAt, 'yyyy-MM-dd');
  const sqlStartDate = sql<string>`strftime('%Y-%m-%d',${jobsTable.startDate})`;

  try {
    const foundJob = await db.query.jobs.findFirst({
      where: (jobs, operators) =>
        operators.or(
          operators.eq(jobs.gitLabJobId, latestGitLabJobId.data.gitLabJobId),
          operators.eq(sqlStartDate, jobDate)
        ),
    });

    return {
      success: true,
      data: {
        isInDB: !!foundJob,
        gitLabJobId: latestGitLabJobId.data.gitLabJobId,
        date: jobDate,
        job: foundJob,
      },
    };
  } catch (error) {
    const newError = handleError(error);
    return {
      success: false,
      error: {
        code: JOB_PROCESSING_ERRORS.DB_QUERY_ERROR,
        message: `Database query error: ${newError.message}`,
      },
    };
  }
}
