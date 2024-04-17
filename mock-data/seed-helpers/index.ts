/* eslint-disable drizzle/enforce-delete-with-where */
/* eslint-disable no-console */
import { db } from '@/db';
import { jobs as jobsTable } from '@/db/schema/jobs';
import { procedures as proceduresTable } from '@/db/schema/procedures';
import { handleError } from './handle-error';
import { getDataFromFiles } from './get-data-from-file';
import { getProceduresToInsert, insertProcedures } from './seed-procedures';
import { insertJobs } from './seed-jobs';

export async function deleteTables() {
  try {
    await db.delete(jobsTable).run();
    await db.delete(proceduresTable).run();

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
};
