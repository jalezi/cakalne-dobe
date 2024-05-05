import { type NextRequest } from 'next/server';
import { handleError } from '@/utils/handle-error';
import { type GetLatestData } from '../get-latest-data/route';
import {
  type InsertInstitution,
  type InsertMaxAllowedDays,
  type InsertProcedure,
  type InsertWaitingPeriods,
  type InsertJob,
  jobs as jobsTable,
  procedures as proceduresTable,
  institutions as institutionsTable,
  maxAllowedDays as maxAllowedDaysTable,
  waitingPeriods as waitingPeriodsTable,
} from '@/db/schema';
import { db } from '@/db';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import { trimmedStringSchema } from '@/lib/zod-schemas/helpers-schema';
import type { GetLatestGitLabJobId } from '../get-latest-gitlab-job-id/route';
import { revalidatePath } from 'next/cache';

const MAX_CHUNK_SIZE = 50;
const EXPECTED_NUMBER_OF_JOBS = 1;

export async function GET(request: NextRequest) {
  const siteUrl = request.nextUrl.origin;

  const latestDataApiUrl = new URL('/api/v1/get-latest-data', siteUrl);

  let latestDataJson: GetLatestData;

  // Fetch the latest data from GitLab job
  try {
    if (await isLatestJobInDB(siteUrl)) {
      return Response.json({
        success: false,
        error: 'Latest data is already in the database',
        meta: {
          url: latestDataApiUrl,
          gitLabJobIdUrl: new URL('/api/v1/get-latest-gitlab-job-id', siteUrl),
        },
      });
    }

    const latestDataApiResponse = await fetch(latestDataApiUrl, {
      next: { revalidate: 0, tags: ['getLatestData'] },
    });

    if (!latestDataApiResponse.ok) {
      return Response.json({
        success: false,
        error: 'Failed to fetch latest data',
        meta: {
          status: latestDataApiResponse.status,
          statusText: latestDataApiResponse.statusText,
          url: latestDataApiResponse.url,
        },
      });
    }

    latestDataJson = (await latestDataApiResponse.json()) as GetLatestData;
  } catch (error) {
    console.error(error);
    const newError = handleError(error);
    return Response.json({
      success: false,
      error: 'Failed to fetch latest data',
      meta: {
        cause: newError.cause,
        message: newError.message,
      },
    });
  }

  if (!latestDataJson.success) {
    return Response.json({
      success: false,
      error: latestDataJson.error,
      meta: latestDataJson,
    });
  }

  // FROM HERE WE WILL INSERT THE DATA INTO THE DATABASE
  const { gitLabJobId, start, end } = latestDataJson.data;

  const notCompleteDataObj = getNotCompleteDatabyTable(
    latestDataJson.data,
    gitLabJobId
  );

  try {
    const jobData: InsertJob = {
      gitLabJobId,
      startDate: start,
      endDate: end,
    };

    const transactionResponse = await db.transaction(async (trx) => {
      try {
        // JOB
        const insertedJobs = await trx
          .insert(jobsTable)
          .values(jobData)
          .returning({
            id: jobsTable.id,
            gitLabJobId: jobsTable.gitLabJobId,
          })
          .onConflictDoNothing();

        // PROCEDURES
        const procedureCodesToCheckIfExistsInDB =
          notCompleteDataObj.procedures.map((procedure) => procedure.code);

        const existingProcedures = await trx.query.procedures.findMany({
          columns: {
            id: true,
            code: true,
            name: true,
          },
          where: (procedures, operators) =>
            operators.inArray(
              procedures.code,
              procedureCodesToCheckIfExistsInDB
            ),
        });

        const newProcedures = notCompleteDataObj.procedures.filter(
          (procedure) =>
            !existingProcedures.some(
              (existingProcedure) => existingProcedure.code === procedure.code
            )
        );

        const insertedProcedures: typeof existingProcedures = [];
        // create chunks of 50 procedures to insert

        for (
          let i = 0;
          i < notCompleteDataObj.procedures.length;
          i += MAX_CHUNK_SIZE
        ) {
          const chunk = newProcedures.slice(i, i + MAX_CHUNK_SIZE);
          if (chunk.length === 0) break;

          const chunkProcedures = await trx
            .insert(proceduresTable)
            .values(chunk)
            .returning({
              id: proceduresTable.id,
              code: proceduresTable.code,
              name: proceduresTable.name,
            });

          insertedProcedures.push(...chunkProcedures);
        }

        // We need this to add proper procedureId to maxAllowedDays and waitingPeriods
        const allProceduresWithDBIds =
          existingProcedures.concat(insertedProcedures);

        // INSTITUTIONS
        const institutionsNamesToCheckIfExistsInDB = Array.from(
          notCompleteDataObj.institutions.keys()
        );
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

        const newInstitutions = Array.from(
          notCompleteDataObj.institutions.values()
        ).filter(
          (inst) =>
            !existingInstitutions.some(
              (existingInstitution) => existingInstitution.name === inst.name
            )
        );

        const insertedInstitutions: typeof existingInstitutions = [];
        // create chunks of 50 institutions to insert
        for (let i = 0; i < newInstitutions.length; i += MAX_CHUNK_SIZE) {
          const chunk = newInstitutions.slice(i, i + MAX_CHUNK_SIZE);
          if (chunk.length === 0) break;
          const chunkInstitutions = await trx
            .insert(institutionsTable)
            .values(chunk)
            .returning({
              id: institutionsTable.id,
              name: institutionsTable.name,
            });

          insertedInstitutions.push(...chunkInstitutions);
        }

        const allInstitutionsWithDBId =
          existingInstitutions.concat(insertedInstitutions);

        // MAX ALLOWED DAYS
        const insertedMaxAllowedDays: { jobId: string; procedureId: string }[] =
          [];
        // create chunks of 50 maxAllowedDays to insert
        for (
          let i = 0;
          i < notCompleteDataObj.maxAllowedDays.length;
          i += MAX_CHUNK_SIZE
        ) {
          const chunk = notCompleteDataObj.maxAllowedDays.slice(
            i,
            i + MAX_CHUNK_SIZE
          );
          if (chunk.length === 0) break;
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
              jobId: insertedJobs[0].id,
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
          insertedMaxAllowedDays.push(...chunkMaxAllowedDays);
        }

        // WAITING PERIODS
        const insertedWaitingPeriods: {
          jobId: string;
          institutionId: string;
        }[] = [];

        for (
          let i = 0;
          i < notCompleteDataObj.waitingPeriods.size;
          i += MAX_CHUNK_SIZE
        ) {
          const chunk = Array.from(
            notCompleteDataObj.waitingPeriods.values()
          ).slice(i, i + MAX_CHUNK_SIZE);
          if (chunk.length === 0) break;
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
              jobId: insertedJobs[0].id,
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
          insertedWaitingPeriods.push(...chunkWaitingPeriods);
        }

        const totalRows =
          EXPECTED_NUMBER_OF_JOBS +
          notCompleteDataObj.procedures.length +
          notCompleteDataObj.institutions.size +
          notCompleteDataObj.maxAllowedDays.length +
          notCompleteDataObj.waitingPeriods.size;

        const totalRowsInserted =
          insertedJobs.length +
          newProcedures.length +
          newInstitutions.length +
          insertedMaxAllowedDays.length +
          insertedWaitingPeriods.length;

        revalidatePath('/', 'page');
        revalidatePath('/[id]', 'page');

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
                inserted: newProcedures.length,
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
      } catch (error) {
        trx.rollback(); // in documentation they are using await trx.rollback()
        return;
      }
    });

    return Response.json({
      success: true,
      data: transactionResponse,
    });
  } catch (error) {
    const newError = handleError(error);
    console.error(newError);
    // ? should we check what kind of error it is and return different response?
    return Response.json({
      success: false,
      error: 'Failed to insert new job data',
      meta: { cause: newError.cause, message: newError.message },
    });
  }
}

type WebhookPayload =
  | {
      success: true;
      data: {
        gitLabJobId: string;
      };
    }
  | {
      success: false;
      error: string;
    };

export async function POST(request: Request) {
  try {
    const webhookJson = (await request.json()) as WebhookPayload;
    if (!webhookJson.success) {
      throw new Error(webhookJson.error || 'Webhook error');
    }

    const siteUrl = new URL(request.url).origin;
    const response = await fetch(
      new URL('/api/v1/insert-new-job-data', siteUrl),
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch the latest data');
    }

    const data = (await response.json()) as
      | {
          success: true;
          data: {
            job: InsertJob;
          };
          meta: Record<string, unknown>;
        }
      | {
          success: false;
          error: string;
          meta: Record<string, unknown>;
        };

    if (!data.success) {
      return Response.json(data, {
        status: 202,
      });
    }

    return Response.json(data);
  } catch (error) {
    const newError = handleError(error);
    console.error(newError);
    return new Response(`Webhook error: ${newError.message}`, {
      status: 202,
    });
  }
}

type NotCompleteDataByTable = {
  procedures: Pick<InsertProcedure, 'code' | 'name'>[];
  institutions: Map<string, Pick<InsertInstitution, 'name'>>;
  maxAllowedDays: (Pick<
    InsertMaxAllowedDays,
    'fast' | 'regular' | 'veryFast' | 'jobId'
  > & { procedureCode: string })[];
  waitingPeriods: Map<
    string,
    Pick<InsertWaitingPeriods, 'fast' | 'regular' | 'veryFast' | 'jobId'> & {
      institutionName: string;
      procedureCode: string;
    }
  >;
};

function getNotCompleteDatabyTable(
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

async function getLatestGitLabJobId(
  siteUrl: string
): Promise<GetLatestGitLabJobId> {
  const apiUrl = new URL('/api/v1/get-latest-gitlab-job-id', siteUrl);

  const response = await fetch(apiUrl, {
    next: { revalidate: 0, tags: ['getLatestGitLabJobId'] },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch latest GitLab job id', {
      cause: 'Response not ok',
    });
  }

  return (await response.json()) as GetLatestGitLabJobId;
}

async function isLatestJobInDB(siteUrl: string) {
  const latestGitLabJobId = await getLatestGitLabJobId(siteUrl);

  if (!latestGitLabJobId.success) {
    throw new Error(latestGitLabJobId.error);
  }

  const foundJob = await db.query.jobs.findFirst({
    where: (jobs, operators) =>
      operators.eq(jobs.gitLabJobId, latestGitLabJobId.data.gitLabJobId),
  });

  return !!foundJob;
}
