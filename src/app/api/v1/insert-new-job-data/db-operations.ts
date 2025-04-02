import { db } from '@/db';
import {
  jobs as jobsTable,
  procedures as proceduresTable,
  institutions as institutionsTable,
  maxAllowedDays as maxAllowedDaysTable,
  waitingPeriods as waitingPeriodsTable,
} from '@/db/schema';
import type * as schema from '@/db/schema';
import { MAX_CHUNK_SIZE, EXPECTED_NUMBER_OF_JOBS } from '@/lib/constants';
import type { Trx, NotCompleteDataByTable } from './types';

/**
 * Process job data and insert it into the database
 * @param jobData Job data to insert
 * @param notCompleteDataObj Additional data to process and insert
 * @returns Result of the database transaction
 */
export async function processJobData(
  jobData: schema.InsertJob,
  notCompleteDataObj: NotCompleteDataByTable
) {
  return db.transaction(async (trx) => {
    try {
      // JOB
      const insertedJobs = await insertJobTransaction(trx, jobData);

      // PROCEDURES
      const { existingProcedures, allProceduresWithDBIds, insertedProcedures } =
        await insertProceduresTransaction(trx, notCompleteDataObj);

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
    } catch (error) {
      trx.rollback();
      throw error;
    }
  });
}

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

/**
 * Inserts items in chunks using the provided insert function.
 * @param items Array of items to insert
 * @param chunkSize Size of each chunk
 * @param insertFn Function to insert a chunk of items
 * @returns Array of inserted items
 */
export async function insertInChunks<T, R>(
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
