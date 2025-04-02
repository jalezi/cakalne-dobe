import { handleError } from '@/utils/handle-error';
import {
  jobs as jobsTable,
  procedures as proceduresTable,
  institutions as institutionsTable,
  maxAllowedDays as maxAllowedDaysTable,
  waitingPeriods as waitingPeriodsTable,
} from '@/db/schema';
import { db } from '@/db';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import { trimmedStringSchema } from '@/lib/zod-schemas/helpers-schema';
import { revalidatePath } from 'next/cache';
import { sql, type TablesRelationalConfig } from 'drizzle-orm';
import { format } from 'date-fns';
import { getLastJobId } from '@/utils/get-last-job-id';
import { z } from 'zod';
import type { ResultSet } from '@libsql/client';
import type { SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import type * as schema from '@/db/schema';

export const maxDuration = 30;

const MAX_CHUNK_SIZE = 50;
const EXPECTED_NUMBER_OF_JOBS = 1;

const webhookPayloadSchema = z.discriminatedUnion('success', [
  z.object({
    success: z.literal('ok'),
  }),
  z.object({
    success: z.literal('error'),
    error: z.string(),
  }),
]);

type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

const BASE_URL = new URL('https://wayback-automachine.gitlab.io');
const BASE_JOBS_URL = new URL('-/cakalne-dobe/-/jobs', BASE_URL);
const JSON_OUT_PATH = '/artifacts/out.json';

type ReturnType<
  TData,
  TMeta extends Record<string, unknown> = {},
  TDetails extends Record<string, unknown> = {},
> =
  | {
      success: true;
      data: TData;
      meta?: TMeta;
    }
  | {
      success: false;
      error: string;
      details?: TDetails;
    };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Trx<TSchema extends TablesRelationalConfig = any> = SQLiteTransaction<
  'async',
  ResultSet,
  typeof schema,
  TSchema
>;

async function insertJobTransaction(trx: Trx, jobData: schema.InsertJob) {
  return trx
    .insert(jobsTable)
    .values(jobData)
    .returning({
      id: jobsTable.id,
      gitLabJobId: jobsTable.gitLabJobId,
    })
    .onConflictDoNothing();
}

/**
 * Retrieves existing procedures and inserts new ones.
 * @param trx Database transaction
 * @param notCompleteDataObj Data containing procedures to process
 * @returns Object with existing, inserted, and combined procedures
 */
async function insertProceduresTransaction(
  trx: Trx,
  notCompleteDataObj: NotCompleteDataByTable
): Promise<{
  existingProcedures: Array<{ id: string; code: string; name: string }>;
  insertedProcedures: Array<{ id: string; code: string; name: string }>;
  allProceduresWithDBIds: Array<{ id: string; code: string; name: string }>;
}> {
  // Get procedure codes to check in database
  const procedureCodesToCheckIfExistsInDB = notCompleteDataObj.procedures.map(
    (procedure) => procedure.code
  );

  // Find existing procedures
  const existingProcedures = await trx.query.procedures.findMany({
    columns: {
      id: true,
      code: true,
      name: true,
    },
    where: (procedures, operators) =>
      operators.inArray(procedures.code, procedureCodesToCheckIfExistsInDB),
  });

  // Find procedures that need to be inserted
  const newProcedures = notCompleteDataObj.procedures.filter(
    (procedure) =>
      !existingProcedures.some(
        (existingProcedure) => existingProcedure.code === procedure.code
      )
  );

  // Insert new procedures in chunks
  const insertedProcedures = await insertInChunks(
    newProcedures,
    MAX_CHUNK_SIZE,
    async (chunk) => {
      const chunkProcedures = await trx
        .insert(proceduresTable)
        .values(chunk)
        .returning({
          id: proceduresTable.id,
          code: proceduresTable.code,
          name: proceduresTable.name,
        });

      return chunkProcedures;
    }
  );

  // Combine existing and new procedures
  const allProceduresWithDBIds = [...existingProcedures, ...insertedProcedures];

  return {
    existingProcedures,
    insertedProcedures,
    allProceduresWithDBIds,
  };
}

/**
 * Retrieves existing institutions and inserts new ones.
 * @param trx Database transaction
 * @param notCompleteDataObj Data containing institutions to process
 * @returns Object with existing and inserted institutions
 */
async function insertInstitutionsTransaction(
  trx: Trx,
  notCompleteDataObj: NotCompleteDataByTable
): Promise<{
  existingInstitutions: Array<{ id: string; name: string }>;
  insertedInstitutions: Array<{ id: string; name: string }>;
}> {
  // Get institution names to check in database
  const institutionsNamesToCheckIfExistsInDB = Array.from(
    notCompleteDataObj.institutions.keys()
  );

  // Find existing institutions
  const existingInstitutions = await trx.query.institutions.findMany({
    columns: {
      id: true,
      name: true,
    },
    where: (institutions, operators) =>
      operators.inArray(
        institutions.name,
        institutionsNamesToCheckIfExistsInDB
      ),
  });

  // Find institutions that need to be inserted
  const newInstitutions = Array.from(
    notCompleteDataObj.institutions.values()
  ).filter(
    (inst) =>
      !existingInstitutions.some(
        (existingInstitution) => existingInstitution.name === inst.name
      )
  );

  // Insert new institutions in chunks
  const insertedInstitutions = await insertInChunks(
    newInstitutions,
    MAX_CHUNK_SIZE,
    async (chunk) => {
      const chunkInstitutions = await trx
        .insert(institutionsTable)
        .values(chunk)
        .returning({
          id: institutionsTable.id,
          name: institutionsTable.name,
        });

      return chunkInstitutions;
    }
  );

  return {
    existingInstitutions,
    insertedInstitutions,
  };
}

/**
 * Inserts max allowed days for procedures.
 * @param trx Database transaction
 * @param notCompleteDataObj Data containing max allowed days to process
 * @param allProceduresWithDBIds Array of all procedures with their DB IDs
 * @param jobId Job ID to associate with the inserted data
 * @returns Array of inserted max allowed days with job and procedure IDs
 */
async function insertMaxAllowedDays(
  trx: Trx,
  notCompleteDataObj: NotCompleteDataByTable,
  allProceduresWithDBIds: Array<{ id: string; code: string; name: string }>,
  jobId: string
): Promise<
  {
    jobId: string;
    procedureId: string;
  }[]
> {
  const insertedMaxAllowedDays: { jobId: string; procedureId: string }[] =
    await insertInChunks(
      notCompleteDataObj.maxAllowedDays,
      MAX_CHUNK_SIZE,
      async (chunk) => {
        const chunkWithJobIdAndProcedureId = chunk.map((maxAllowedDay) => {
          const procedure = allProceduresWithDBIds.find(
            (proc) => proc.code === maxAllowedDay.procedureCode
          );
          if (!procedure) {
            console.error("Procedure doesn't exist in the database");
            throw new Error(
              `Procedure with code ${maxAllowedDay.procedureCode} not found in the database`
            );
          }
          if (!procedure.id) {
            console.error('Procedure id is missing');
            throw new Error('Procedure id is missing');
          }
          // there is a procedureCode property in maxAllowedDay which is not needed
          return {
            regular: maxAllowedDay.regular,
            fast: maxAllowedDay.fast,
            veryFast: maxAllowedDay.veryFast,
            jobId: jobId,
            procedureId: procedure.id,
          };
        });
        const chunkMaxAllowedDays = await trx
          .insert(maxAllowedDaysTable)
          .values(chunkWithJobIdAndProcedureId)
          .returning({
            jobId: maxAllowedDaysTable.jobId,
            procedureId: maxAllowedDaysTable.procedureId,
          });
        return chunkMaxAllowedDays;
      }
    );

  return insertedMaxAllowedDays;
}

/**
 * Inserts waiting periods for procedures and institutions.
 * @param trx Database transaction
 * @param notCompleteDataObj Data containing waiting periods to process
 * @param allInstitutionsWithDBId Array of all institutions with their DB IDs
 * @param allProceduresWithDBIds Array of all procedures with their DB IDs
 * @param jobId Job ID to associate with the inserted data
 * @returns Array of inserted waiting periods with job and institution IDs
 */
async function insertWaitingPeriodsTransaction(
  trx: Trx,
  notCompleteDataObj: NotCompleteDataByTable,
  allInstitutionsWithDBId: Array<{ id: string; name: string }>,
  allProceduresWithDBIds: Array<{ id: string; code: string; name: string }>,
  jobId: string
): Promise<
  {
    jobId: string;
    institutionId: string;
  }[]
> {
  const insertedWaitingPeriods: {
    jobId: string;
    institutionId: string;
  }[] = await insertInChunks(
    Array.from(notCompleteDataObj.waitingPeriods.values()),
    MAX_CHUNK_SIZE,
    async (chunk) => {
      const chunkWithJobIdAndInstitutionId = chunk.map((waitingPeriod) => {
        const institution = allInstitutionsWithDBId.find((inst) => {
          return inst.name === waitingPeriod.institutionName;
        });
        if (!institution) {
          console.error("Institution doesn't exist in the database");
          throw new Error(
            `Institution with name ${waitingPeriod.institutionName} not found in the database`
          );
        }
        if (!institution.id) {
          console.error('Institution id is missing');
          throw new Error('Institution id is missing');
        }
        const procedure = allProceduresWithDBIds.find(
          (proc) => proc.code === waitingPeriod.procedureCode
        );
        if (!procedure) {
          console.error("Procedure doesn't exist in the database");
          throw new Error(
            `Procedure with code ${waitingPeriod.procedureCode} not found in the database`
          );
        }
        if (!procedure.id) {
          console.error('Procedure id is missing');
          throw new Error('Procedure id is missing');
        }
        // there is a procedureCode and institutionName property in waitingPeriod which is not needed
        return {
          regular: waitingPeriod.regular,
          fast: waitingPeriod.fast,
          veryFast: waitingPeriod.veryFast,
          jobId,
          institutionId: institution.id,
          procedureId: procedure.id,
        };
      });
      const chunkWaitingPeriods = await trx
        .insert(waitingPeriodsTable)
        .values(chunkWithJobIdAndInstitutionId)
        .returning({
          jobId: waitingPeriodsTable.jobId,
          institutionId: waitingPeriodsTable.institutionId,
        });
      return chunkWaitingPeriods;
    }
  );
  return insertedWaitingPeriods;
}

export async function POST(request: Request) {
  try {
    const webhookJson = await request.json();

    const validationResult = validateWebhookPayload(webhookJson);
    if (!validationResult.success) {
      throw new Error(validationResult.error);
    }

    const shouldInsert = await shouldInsertLatestJob();
    if (!shouldInsert.success) {
      throw new Error(shouldInsert.error);
    }

    const lastGitLabIdResponse = await getLastJobId(10);
    if (!lastGitLabIdResponse.success) {
      throw new Error(lastGitLabIdResponse.error);
    }
    const gitLabJobId = lastGitLabIdResponse.data.gitLabJobId;

    const dataResponse = await getData(gitLabJobId);
    if (!dataResponse.success) {
      throw new Error(dataResponse.error);
    }

    const preparedJobData = await prepareJobData(gitLabJobId);
    if (!preparedJobData.success) {
      throw new Error(preparedJobData.error);
    }
    const { notCompleteDataObj, jobData } = preparedJobData.data;

    try {
      const transactionResponse = await db.transaction(async (trx) => {
        try {
          // JOB
          const insertedJobs = await insertJobTransaction(trx, jobData);

          // PROCEDURES
          const {
            existingProcedures,
            allProceduresWithDBIds,
            insertedProcedures,
          } = await insertProceduresTransaction(trx, notCompleteDataObj);

          // INSTITUTIONS
          const { existingInstitutions, insertedInstitutions } =
            await insertInstitutionsTransaction(trx, notCompleteDataObj);

          const newInstitutions = Array.from(
            notCompleteDataObj.institutions.values()
          ).filter(
            (inst) =>
              !existingInstitutions.some(
                (existingInstitution) => existingInstitution.name === inst.name
              )
          );

          const allInstitutionsWithDBId =
            existingInstitutions.concat(insertedInstitutions);

          // MAX ALLOWED DAYS
          const insertedMaxAllowedDays = await insertMaxAllowedDays(
            trx,
            notCompleteDataObj,
            allProceduresWithDBIds,
            insertedJobs[0].id
          );

          // WAITING PERIODS
          const insertedWaitingPeriods: {
            jobId: string;
            institutionId: string;
          }[] = await insertWaitingPeriodsTransaction(
            trx,
            notCompleteDataObj,
            allInstitutionsWithDBId,
            allProceduresWithDBIds,
            insertedJobs[0].id
          );

          const totalRows =
            EXPECTED_NUMBER_OF_JOBS +
            notCompleteDataObj.procedures.length +
            notCompleteDataObj.institutions.size +
            notCompleteDataObj.maxAllowedDays.length +
            notCompleteDataObj.waitingPeriods.size;

          const totalRowsInserted =
            insertedJobs.length +
            insertedProcedures.length +
            newInstitutions.length +
            insertedMaxAllowedDays.length +
            insertedWaitingPeriods.length;

          revalidatePath('/', 'layout');
          revalidatePath('/', 'page');
          revalidatePath('/[id]/', 'page');

          return {
            success: true,
            data: {
              job: insertedJobs[0],
            },
            meta: {
              length: {
                total: {
                  total: totalRows,
                  inserted: totalRowsInserted,
                },
                job: {
                  total: EXPECTED_NUMBER_OF_JOBS,
                  inserted: insertedJobs.length,
                },
                procedures: {
                  total: notCompleteDataObj.procedures.length,
                  inserted: insertedProcedures.length,
                  existing: existingProcedures.length,
                },
                institutions: {
                  total: notCompleteDataObj.institutions.size,
                  inserted: newInstitutions.length,
                  existing: existingInstitutions.length,
                },
                maxAllowedDays: {
                  total: notCompleteDataObj.maxAllowedDays.length,
                  inserted: insertedMaxAllowedDays.length,
                },
                waitingPeriods: {
                  total: notCompleteDataObj.waitingPeriods.size,
                  inserted: insertedWaitingPeriods.length,
                },
              },
            },
          };
        } catch {
          trx.rollback(); // in documentation they are using await trx.rollback()
          return;
        }
      });

      revalidatePath('/', 'layout');
      revalidatePath('/', 'page');
      revalidatePath('/[id]/', 'page');

      return Response.json({
        success: true,
        data: transactionResponse,
      });
    } catch (error) {
      const newError = handleError(error);
      console.error(newError);
      throw new Error(newError.message);
    }
  } catch (error) {
    const newError = handleError(error);
    console.error(newError);
    return new Response(`Webhook error: ${newError.message}`, {
      status: 202,
    });
  }
}

/**
 * Inserts items in chunks using the provided insert function.
 * @param items Array of items to insert
 * @param chunkSize Size of each chunk
 * @param insertFn Function to insert a chunk of items
 * @returns Array of inserted items
 */
async function insertInChunks<T, R>(
  items: T[],
  chunkSize: number,
  insertFn: (chunk: T[]) => Promise<R[]>
): Promise<R[]> {
  const result: R[] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    if (chunk.length === 0) break;

    const inserted = await insertFn(chunk);
    result.push(...inserted);
  }

  return result;
}

/**
 * Validates the webhook payload.
 * @param payload The payload to validate
 * @returns Validation result
 */
function validateWebhookPayload(
  payload: unknown
): ReturnType<Exclude<WebhookPayload, { success: 'error' }>> {
  const parsedPayload = webhookPayloadSchema.safeParse(payload);
  if (!parsedPayload.success) {
    return {
      success: false,
      error: 'Invalid webhook payload',
      details: {
        message: parsedPayload.error.message,
        payload,
        errors: parsedPayload.error.flatten(),
      },
    };
  }

  if (parsedPayload.data.success === 'error') {
    return {
      success: false,
      error: parsedPayload.data.error,
      details: {
        message: 'GitLab job failed',
        payload,
        errors: parsedPayload.data.error,
      },
    };
  }

  return {
    success: true,
    data: parsedPayload.data,
  };
}

/**
 * Checks if the latest job should be inserted into the database.
 * @returns Result indicating whether the job should be inserted
 */
async function shouldInsertLatestJob(): Promise<ReturnType<'ok'>> {
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

async function getData(
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
async function prepareJobData(gitLabJobId: string): Promise<
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
 * Type representing the data structure for incomplete data by table.
 */
type NotCompleteDataByTable = {
  procedures: Pick<schema.InsertProcedure, 'code' | 'name'>[];
  institutions: Map<string, Pick<schema.InsertInstitution, 'name'>>;
  maxAllowedDays: (Pick<
    schema.InsertMaxAllowedDays,
    'fast' | 'regular' | 'veryFast' | 'jobId'
  > & { procedureCode: string })[];
  waitingPeriods: Map<
    string,
    Pick<
      schema.InsertWaitingPeriods,
      'fast' | 'regular' | 'veryFast' | 'jobId'
    > & {
      institutionName: string;
      procedureCode: string;
    }
  >;
};

/**
 * Processes and organizes incomplete data by table.
 * @param input The input data containing procedures, institutions, max allowed days, and waiting periods
 * @param jobId The job ID to associate with the data
 * @returns Processed data organized by table
 */
function getNotCompleteDataByTable(
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
 * Retrieves the latest job from the database.
 * @returns Object containing information about whether the job is already in the database
 */
async function getLatestJobInDb(): Promise<
  ReturnType<{
    isInDB: boolean;
    gitLabJobId: string;
    date: string;
    job: typeof jobsTable.$inferSelect | undefined;
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
