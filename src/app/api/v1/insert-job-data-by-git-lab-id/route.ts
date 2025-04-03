/**
 * @module InsertJobDataByGitLabId
 * @description This module handles the insertion of job data into the database
 * based on a specific GitLab job ID. It validates the input,
 * checks if gitLabId is already in jobs table in database and it's not for the same date (YYYY-MM-DD),
 * fetches job data,
 * and inserts the data into the database. It also handles errors and revalidates paths.
 */

import { handleError } from '@/utils/handle-error';
import type { ReturnType } from '../insert-new-job-data/types';
import { sql } from 'drizzle-orm';
import { jobs as jobsTable } from '@/db/schema';
import { db } from '@/db';
import { z } from 'zod';
import type { AllData } from '@/lib/zod-schemas/data-schemas';

const BASE_URL = new URL('https://wayback-automachine.gitlab.io');
const BASE_JOBS_URL = new URL('-/cakalne-dobe/-/jobs', BASE_URL);
const JSON_OUT_PATH = '/artifacts/out.json';

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format: YYYY-MM-DD')
  .describe('YYYY-MM-DD');

const webhookSuccessOkSchema = z.object({
  success: z.literal('ok'),
  gitLabJobId: z.string(),
  date: dateSchema,
});

const webhookPayloadSchema = z.discriminatedUnion('success', [
  webhookSuccessOkSchema,
  z.object({
    success: z.literal('error'),
    error: z.string(),
  }),
]);

const isGitLabJobIDInDBSchema = webhookSuccessOkSchema.pick({
  gitLabJobId: true,
  date: true,
});

async function isGitLabJobIDInDB(
  gitLabJobId: string,
  date: string
): Promise<
  ReturnType<
    | {
        foundJobByGitLabId: boolean;
        foundJobByDate: boolean;
        foundJobWithDate: boolean;
      }
    | false,
    Record<string, unknown>,
    {
      error?: unknown;
      code?: number;
      issues?: z.typeToFlattenedError<
        { gitLabJobId: string; date: string },
        string
      >;
    }
  >
> {
  try {
    const validateArgs = isGitLabJobIDInDBSchema.safeParse({
      gitLabJobId,
      date,
    });

    if (!validateArgs.success) {
      return {
        success: false,
        error: 'Invalid arguments',
        details: {
          code: 422,
          issues: validateArgs.error.flatten(),
        },
      };
    }

    const sqlStartDate = sql<string>`strftime('%Y-%m-%d',${jobsTable.startDate})`;

    const foundJobByGitLabId = await db.query.jobs.findFirst({
      where: (jobs, operators) => operators.eq(jobs.gitLabJobId, gitLabJobId),
    });

    const foundJobByDate = await db.query.jobs.findFirst({
      where: (undefined, operators) => operators.eq(sqlStartDate, date),
    });

    const foundJobWithDate = await db.query.jobs.findFirst({
      where: (jobs, operators) =>
        operators.and(
          operators.eq(jobs.gitLabJobId, gitLabJobId),
          operators.eq(sqlStartDate, date)
        ),
    });

    if (foundJobByGitLabId || foundJobByDate) {
      return {
        success: true,
        data: {
          foundJobByGitLabId: Boolean(foundJobByGitLabId),
          foundJobByDate: Boolean(foundJobByDate),
          foundJobWithDate: Boolean(foundJobWithDate),
        },
      };
    }

    return {
      success: true,
      data: false,
    };
  } catch (error) {
    const newError = handleError(error);
    return {
      success: false,
      error: `Database query error: ${newError.message}`,
      details: { error: newError, code: 500 },
    };
  }
}

export async function POST(request: Request) {
  try {
    const webhookJson = await request.json();

    const validationResult = webhookPayloadSchema
      .transform((obj) => {
        if (obj.success === 'error') {
          return obj;
        }
        return {
          ...obj,
          date: obj.date.slice(0, 10), // Extract only the date part (YYYY-MM-DD)
        };
      })
      .safeParse(webhookJson);
    if (!validationResult.success) {
      return Response.json(
        {
          success: false,
          error: 'Invalid payload format',
          details: {
            issues: validationResult.error.flatten(),
          },
        },
        {
          status: 422,
        }
      );
    }

    // Check if the payload indicates an error
    if (validationResult.data.success === 'error') {
      return Response.json(
        {
          success: false,
          error: validationResult.data.error,
        },
        {
          status: 422,
        }
      );
    }

    const gitLabJobId = validationResult.data.gitLabJobId;
    const date = validationResult.data.date;
    const isInDBResponse = await isGitLabJobIDInDB(gitLabJobId, date);
    if (!isInDBResponse.success) {
      return Response.json(
        {
          success: false,
          error: isInDBResponse.error,
        },
        {
          status: isInDBResponse.details?.code || 500,
        }
      );
    }

    // Check if the job ID or date already exists in the database
    if (isInDBResponse.data) {
      return Response.json(
        {
          success: false,
          error: 'GitLab job ID or for date already exists in the database',
          details: isInDBResponse.data,
        },
        {
          status: 409,
        }
      );
    }

    // Fetch the job data from the GitLab URL
    const jobDataUrl = new URL(
      `jobs/${gitLabJobId}${JSON_OUT_PATH}`,
      BASE_JOBS_URL
    ).toString();

    const response = await fetch(jobDataUrl);

    if (!response.ok) {
      return Response.json(
        {
          success: false,
          error: `Failed to fetch job data: ${response.statusText}`,
          jobDataUrl,
        },
        {
          status: response.status,
        }
      );
    }

    const jobData = (await response.json()) as AllData;
    if (!jobData) {
      return Response.json(
        {
          success: false,
          error: 'No job data found',
        },
        {
          status: 404,
        }
      );
    }

    return Response.json({
      success: true,
      data: jobData,
    });
  } catch (error) {
    const newError = handleError(error);
    console.error(newError);
    return new Response(`Webhook error: ${newError.message}`, {
      status: 500,
    });
  }
}
