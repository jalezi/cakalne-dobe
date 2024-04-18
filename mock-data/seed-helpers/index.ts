/* eslint-disable drizzle/enforce-delete-with-where */
/* eslint-disable no-console */
import { db } from '@/db';
import { jobs } from '@/db/schema/jobs';
import { procedures } from '@/db/schema/procedures';
import { handleError } from './handle-error';
import { getDataFromFiles } from './get-data-from-file';
import { getProceduresToInsert, insertProcedures } from './seed-procedures';
import { insertJobs } from './seed-jobs';
import { insertMaxAllowedDays } from './seed-max-allowed-days';
import { institutions, maxAllowedDays } from '@/db/schema';
import {
  getInstitutionsToInsert,
  insertInstitutions,
} from './seed-institutions';

export async function deleteTables() {
  try {
    console.info('\tDeleting jobs table...');
    await db.delete(jobs).run();
    console.info('\tDeleting procedures table...');
    await db.delete(procedures).run();
    console.info('\tDeleting maxAllowedDays table...');
    await db.delete(maxAllowedDays).run();
    console.log('\tDeleting institutions table...');
    await db.delete(institutions).run();

    return { success: true, error: null } as const;
  } catch (error) {
    const newError = handleError(error);
    return { success: false, error: newError } as const;
  }
}

export const seedHelpers = {
  deleteTables,
  getDataFromFiles,
  getInstitutionsToInsert,
  getProceduresToInsert,
  handleError,
  insertInstitutions,
  insertJobs,
  insertProcedures,
  insertMaxAllowedDays,
};
