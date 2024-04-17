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
import { maxAllowedDays } from '@/db/schema';

export async function deleteTables() {
  try {
    await db.delete(jobs).run();
    await db.delete(procedures).run();
    await db.delete(maxAllowedDays).run();

    return { success: true, error: null } as const;
  } catch (error) {
    const newError = handleError(error);
    return { success: false, error: newError } as const;
  }
}

export const seedHelpers = {
  deleteTables,
  getDataFromFiles,
  getProceduresToInsert,
  handleError,
  insertJobs,
  insertProcedures,
  insertMaxAllowedDays,
};
