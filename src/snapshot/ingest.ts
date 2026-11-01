import { and, eq, ne, sql } from 'drizzle-orm';
import type { db as appDb } from '@/db';
import { renameProcedures } from '@/db/rename-procedures';
import {
  institutions as institutionsTable,
  jobs as jobsTable,
  maxAllowedDays as maxAllowedDaysTable,
  procedures as proceduresTable,
  waitingPeriods as waitingPeriodsTable,
} from '@/db/schema';
import { MAX_CHUNK_SIZE } from '@/lib/constants';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import type { Result, SnapshotInsertPayload } from '@/types';
import {
  prepareSnapshotInsertPayload,
  type SnapshotTransformerMeta,
} from './transformer';

export const INGEST_SNAPSHOT_ERRORS = {
  TRANSFORM_FAILED: 'TRANSFORM_FAILED',
  JOB_EXISTS: 'JOB_EXISTS',
  WRITE_FAILED: 'WRITE_FAILED',
} as const;

type Database = typeof appDb;
type Trx = Parameters<Parameters<Database['transaction']>[0]>[0];

export type IngestedSnapshot = {
  job: { id: string; gitLabJobId: string; day: string };
  inserted: {
    procedures: number;
    institutions: number;
    maxAllowedDays: number;
    waitingPeriods: number;
  };
};

const ljubljanaDay = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Ljubljana',
});

/**
 * The Job's day: the Ljubljana calendar day its Snapshot started on (ADR-0002).
 * @param start The Snapshot's `start`
 * @returns The day as YYYY-MM-DD; throws a RangeError when `start` is not a date
 */
export function jobDay(start: string): string {
  return ljubljanaDay.format(new Date(start));
}

// Thrown inside the transaction to roll it back, then returned as JOB_EXISTS
class JobExistsError extends Error {}

/**
 * Stores one Job's Snapshot in one transaction: the Job, new Procedures and
 * Institutions, its Max Allowed Days and Waiting Periods. Never throws.
 * @param db Database to write to
 * @param gitLabJobId GitLab job ID of the Job
 * @param snapshot The Job's Snapshot
 * @returns The stored Job and the number of rows inserted per table
 */
export async function ingestSnapshot(
  db: Database,
  gitLabJobId: string,
  snapshot: AllData
): Promise<Result<IngestedSnapshot, SnapshotTransformerMeta>> {
  let payloadResult: ReturnType<typeof prepareSnapshotInsertPayload>;
  let day: string;
  try {
    day = jobDay(snapshot.start);
    payloadResult = prepareSnapshotInsertPayload(snapshot, gitLabJobId);
  } catch (error) {
    // The transformer returns Zod errors and rethrows the rest
    return {
      success: false,
      error: {
        code: INGEST_SNAPSHOT_ERRORS.TRANSFORM_FAILED,
        message: `Failed to prepare snapshot insert payload for job ${gitLabJobId}`,
      },
      meta: { cause: error instanceof Error ? error.message : String(error) },
    };
  }
  if (!payloadResult.success) {
    return payloadResult;
  }
  const payload = payloadResult.data;

  try {
    const data = await db.transaction(async (trx) => {
      // ONE JOB PER DAY: stored start dates carry Ljubljana's offset, so their date part is the day
      const sameDayJob = await trx.query.jobs.findFirst({
        columns: { id: true },
        where: and(
          eq(sql`substr(${jobsTable.startDate}, 1, 10)`, day),
          ne(jobsTable.gitLabJobId, gitLabJobId)
        ),
      });
      if (sameDayJob) {
        throw new JobExistsError(
          `A Job for day ${day} already exists in the database`
        );
      }

      // JOB
      const [job] = await trx
        .insert(jobsTable)
        .values({
          gitLabJobId,
          startDate: snapshot.start,
          endDate: snapshot.end,
        })
        .returning({ id: jobsTable.id, gitLabJobId: jobsTable.gitLabJobId })
        .onConflictDoNothing();
      // The insert skips a conflicting Job instead of failing
      if (!job) {
        throw new JobExistsError(
          `Job with GitLab job ID ${gitLabJobId} already exists in the database`
        );
      }

      // PROCEDURES
      const { insertedProcedures, allProceduresWithDBIds } =
        await insertProceduresTransaction(trx, payload);

      // INSTITUTIONS
      const { existingInstitutions, insertedInstitutions } =
        await insertInstitutionsTransaction(trx, payload);
      const allInstitutionsWithDBId =
        existingInstitutions.concat(insertedInstitutions);

      // MAX ALLOWED DAYS
      const insertedMaxAllowedDays = await insertMaxAllowedDays(
        trx,
        payload,
        allProceduresWithDBIds,
        job.id
      );

      // WAITING PERIODS
      const insertedWaitingPeriods = await insertWaitingPeriodsTransaction(
        trx,
        payload,
        allInstitutionsWithDBId,
        allProceduresWithDBIds,
        job.id
      );

      return {
        job: { ...job, day },
        inserted: {
          procedures: insertedProcedures.length,
          institutions: insertedInstitutions.length,
          maxAllowedDays: insertedMaxAllowedDays.length,
          waitingPeriods: insertedWaitingPeriods.length,
        },
      };
    });
    return { success: true, data };
  } catch (error) {
    if (error instanceof JobExistsError) {
      return {
        success: false,
        error: {
          code: INGEST_SNAPSHOT_ERRORS.JOB_EXISTS,
          message: error.message,
        },
      };
    }
    let message = error instanceof Error ? error.message : 'Transaction failed';
    // A failed query's message names the step; the database's reason is its cause
    if (error instanceof Error && error.cause instanceof Error) {
      message += `\ncause: ${error.cause.message}`;
    }
    return {
      success: false,
      error: { code: INGEST_SNAPSHOT_ERRORS.WRITE_FAILED, message },
    };
  }
}

/**
 * Retrieves existing procedures and inserts new ones.
 * @param trx Database transaction
 * @param snapshotInsertPayload Data containing procedures to process
 * @returns Object with inserted and combined procedures
 */
async function insertProceduresTransaction(
  trx: Trx,
  snapshotInsertPayload: SnapshotInsertPayload
): Promise<{
  insertedProcedures: Array<{ id: string; code: string; name: string }>;
  allProceduresWithDBIds: Array<{ id: string; code: string; name: string }>;
}> {
  // Get procedure codes to check in database
  const procedureCodesToCheckIfExistsInDB =
    snapshotInsertPayload.procedures.map((procedure) => procedure.code);

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

  // Rename first, so a name an existing procedure gives up is free for a new one
  await renameProcedures(
    trx,
    snapshotInsertPayload.procedures,
    new Map(existingProcedures.map(({ code, name }) => [code, name]))
  );

  // Find procedures that need to be inserted
  const newProcedures = snapshotInsertPayload.procedures.filter(
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
    insertedProcedures,
    allProceduresWithDBIds,
  };
}

/**
 * Retrieves existing institutions and inserts new ones.
 * @param trx Database transaction
 * @param snapshotInsertPayload Data containing institutions to process
 * @returns Object with existing and inserted institutions
 */
async function insertInstitutionsTransaction(
  trx: Trx,
  snapshotInsertPayload: SnapshotInsertPayload
): Promise<{
  existingInstitutions: Array<{ id: string; name: string }>;
  insertedInstitutions: Array<{ id: string; name: string }>;
}> {
  // Get institution names to check in database
  const institutionsNamesToCheckIfExistsInDB = Array.from(
    snapshotInsertPayload.institutions.keys()
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
    snapshotInsertPayload.institutions.values()
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
 * @param snapshotInsertPayload Data containing max allowed days to process
 * @param allProceduresWithDBIds Array of all procedures with their DB IDs
 * @param jobId Job ID to associate with the inserted data
 * @returns Array of inserted max allowed days with job and procedure IDs
 */
async function insertMaxAllowedDays(
  trx: Trx,
  snapshotInsertPayload: SnapshotInsertPayload,
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
      snapshotInsertPayload.maxAllowedDays,
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
 * @param snapshotInsertPayload Data containing waiting periods to process
 * @param allInstitutionsWithDBId Array of all institutions with their DB IDs
 * @param allProceduresWithDBIds Array of all procedures with their DB IDs
 * @param jobId Job ID to associate with the inserted data
 * @returns Array of inserted waiting periods with job and institution IDs
 */
async function insertWaitingPeriodsTransaction(
  trx: Trx,
  snapshotInsertPayload: SnapshotInsertPayload,
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
    Array.from(snapshotInsertPayload.waitingPeriods.values()),
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
