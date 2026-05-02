import { format } from 'date-fns';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import type * as schema from '@/db/schema';
import { jobs as jobsTable } from '@/db/schema';
import { fetchAndPrepareSnapshot } from '@/snapshot';
import { getLastJobId } from '@/utils/get-last-job-id';
import { handleError } from '@/utils/handle-error';
import type { ReturnType, SnapshotInsertPayload } from './types';

/**
 * Checks if the latest job should be inserted into the database.
 * @returns Result indicating whether the job should be inserted
 */
export async function shouldInsertLatestJob(): Promise<ReturnType<'ok'>> {
  const latestJobInDbResult = await getLatestJobInDb();

  if (!latestJobInDbResult.success) {
    return {
      success: false,
      error: latestJobInDbResult.error,
      details: {
        message: 'Failed to get latest job from the database',
        error: latestJobInDbResult.error,
      },
    };
  }

  if (latestJobInDbResult.data.isInDB) {
    return {
      success: false,
      error: 'Latest job already exists in the database',
      details: {
        message: 'Latest job already exists in the database',
        gitLabJobId: latestJobInDbResult.data.gitLabJobId,
        date: latestJobInDbResult.data.date,
        job: latestJobInDbResult.data.job,
        jobId: latestJobInDbResult.data.job?.id,
      },
    };
  }

  return { success: true, data: 'ok' };
}

/**
 * Prepares job data for insertion into the database.
 * @param gitLabJobId The GitLab job ID
 * @returns Prepared job data and additional information
 */
export async function prepareJobData(gitLabJobId: string): Promise<
  ReturnType<{
    jobData: schema.InsertJob;
    snapshotInsertPayload: SnapshotInsertPayload;
  }>
> {
  return fetchAndPrepareSnapshot(gitLabJobId);
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
      error: `Failed to get latest GitLab job ID: ${latestGitLabJobId.error}`,
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
      error: `Database query error: ${newError.message}`,
      details: { error: newError },
    };
  }
}
