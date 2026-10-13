/** biome-ignore-all lint/suspicious/noConsole: We need for debug */
import { db } from '@/db';
import { institutions, maxAllowedDays } from '@/db/schema';
import { jobs } from '@/db/schema/jobs';
import { procedures } from '@/db/schema/procedures';
import { handleError } from '@/utils/handle-error';
import { getDataFromFiles } from './get-data-from-file';

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
    console.log('\tDeleting waitingTimes table...');

    return { success: true, error: null } as const;
  } catch (error) {
    const newError = handleError(error);
    return { success: false, error: newError } as const;
  }
}

export const seedHelpers = {
  deleteTables,
  getDataFromFiles,
};
