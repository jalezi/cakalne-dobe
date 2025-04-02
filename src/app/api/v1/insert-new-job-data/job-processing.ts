import { db } from '@/db';
import { jobs as jobsTable } from '@/db/schema';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import { trimmedStringSchema } from '@/lib/zod-schemas/helpers-schema';
import { sql } from 'drizzle-orm';
import { format } from 'date-fns';
import { getLastJobId } from '@/utils/get-last-job-id';
import { handleError } from '@/utils/handle-error';
import type * as schema from '@/db/schema';
import type { ReturnType, NotCompleteDataByTable } from './types';

const BASE_URL = new URL('https://wayback-automachine.gitlab.io');
const BASE_JOBS_URL = new URL('-/cakalne-dobe/-/jobs', BASE_URL);
const JSON_OUT_PATH = '/artifacts/out.json';

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

export async function getData(
  gitLabJobId: string
): Promise<
  ReturnType<
    AllData,
    { gitLabJobId: string; start: string; end: string },
    { message: string; url: string; status: number; statusText: string }
  >
> {
  const jobUrl = new URL(`jobs/${gitLabJobId}${JSON_OUT_PATH}`, BASE_JOBS_URL);

  const responseOut = await fetch(jobUrl);
  if (!responseOut.ok) {
    return {
      success: false,
      error: `Failed to fetch job output for the latest gitlab job with id: ${gitLabJobId}`,
      details: {
        message: 'Failed to fetch job output',
        url: jobUrl.toString(),
        status: responseOut.status,
        statusText: responseOut.statusText,
      },
    };
  }

  const data = (await responseOut.json()) as AllData;
  return {
    success: true,
    data,
    meta: {
      gitLabJobId,
      start: data.start,
      end: data.end,
    },
  };
}

/**
 * Prepares job data for insertion into the database.
 * @param gitLabJobId The GitLab job ID
 * @returns Prepared job data and additional information
 */
export async function prepareJobData(gitLabJobId: string): Promise<
  ReturnType<{
    jobData: schema.InsertJob;
    notCompleteDataObj: NotCompleteDataByTable;
  }>
> {
  const dataResponse = await getData(gitLabJobId);

  if (!dataResponse.success) {
    return {
      success: false,
      error: dataResponse.error,
      details: {
        message: 'Failed to fetch job data',
        url: dataResponse.details?.url,
        status: dataResponse.details?.status,
        statusText: dataResponse.details?.statusText,
      },
    };
  }

  const combinedData = { gitLabJobId, ...dataResponse.data };
  const { start, end } = combinedData;

  const jobData: schema.InsertJob = {
    gitLabJobId,
    startDate: start,
    endDate: end,
  };
  const notCompleteDataObj = getNotCompleteDataByTable(
    combinedData,
    gitLabJobId
  );

  return {
    success: true,
    data: {
      jobData,
      notCompleteDataObj,
    },
    meta: {
      gitLabJobId,
      start,
      end,
    },
  };
}

/**
 * Processes and organizes incomplete data by table.
 * @param input The input data containing procedures, institutions, max allowed days, and waiting periods
 * @param jobId The job ID to associate with the data
 * @returns Processed data organized by table
 */
export function getNotCompleteDataByTable(
  input: AllData,
  jobId: string
): NotCompleteDataByTable {
  const procedures: NotCompleteDataByTable['procedures'] = [];
  const institutions: NotCompleteDataByTable['institutions'] = new Map();
  const maxAllowedDays: NotCompleteDataByTable['maxAllowedDays'] = [];
  const waitingPeriods: NotCompleteDataByTable['waitingPeriods'] = new Map();

  for (const procedure of input.procedures) {
    procedures.push({
      code: procedure.code,
      name: trimmedStringSchema.parse(procedure.name),
    });

    maxAllowedDays.push({
      ...procedure.maxAllowedDays,
      jobId,
      procedureCode: procedure.code,
    });

    for (const [urgency, facilityUrgencyDays] of Object.entries(
      procedure.waitingPeriods
    )) {
      if (!facilityUrgencyDays) continue;

      for (const { facility, days } of facilityUrgencyDays) {
        const trimmedFacility = trimmedStringSchema.parse(facility);
        const institution = institutions.get(trimmedFacility);

        if (!institution) {
          institutions.set(trimmedFacility, {
            name: trimmedFacility,
          });
        }

        const key = `${trimmedFacility}-${procedure.code}`;
        const hasWaitingPeriod = waitingPeriods.has(key);
        if (hasWaitingPeriod) {
          const existingWaitingPeriod = waitingPeriods.get(key);
          if (existingWaitingPeriod) {
            existingWaitingPeriod[urgency as 'regular' | 'fast' | 'veryFast'] =
              days;
          }
          continue;
        }

        waitingPeriods.set(key, {
          regular: null,
          fast: null,
          veryFast: null,
          [urgency]: days,
          jobId,
          procedureCode: procedure.code,
          institutionName: trimmedFacility,
        });
      }
    }
  }
  return {
    procedures,
    institutions,
    maxAllowedDays,
    waitingPeriods,
  };
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
