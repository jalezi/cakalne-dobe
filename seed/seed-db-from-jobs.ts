/* eslint-disable drizzle/enforce-delete-with-where */
/* eslint-disable no-console */
import fs from 'fs/promises';
import { cwd } from 'process';

import { seedHelpers } from './seed-helpers';

const dirName = `${cwd()}/mock-data/jobs`;
const getDataFileNames = async () => await fs.readdir('./mock-data/jobs');

export const seedDBFromJobs = async (input: boolean = false) => {
  console.info('--- Seeding database from jobs...');

  if (input) {
    console.info('--- Deleting tables...');
    const deletingResult = await seedHelpers.deleteTables();
    if (!deletingResult.success) {
      console.warn('Error deleting tables: ', deletingResult.error.message);
      console.error(deletingResult.error);
      process.exit(1);
    }
  }

  // GET DATA FROM FILES
  console.info('--- Reading data from files...');
  const fileNames = await getDataFileNames().then((files) =>
    files.filter(
      (file) => file.endsWith('.json') && !file.startsWith('archive')
    )
  );

  const { data: dataMap, errors: readingFileErrors } =
    await seedHelpers.getDataFromFiles(fileNames, dirName);
  if (readingFileErrors && readingFileErrors.length > 0) {
    console.warn('Errors reading files:');
    for (const error of readingFileErrors) {
      console.error(error);
    }
    process.exit(1);
  }

  // INSERT JOBS
  console.info('--- Inserting jobs...');
  const jobs = Array.from(dataMap.entries());
  const { errors: insertJobErrors } = await seedHelpers.insertJobs(jobs);
  if (insertJobErrors && insertJobErrors.length > 0) {
    console.warn('Errors inserting jobs:');
    for (const error of insertJobErrors) {
      console.error(error);
    }
    process.exit(1);
  }

  // INSERT PROCEDURES
  console.info('--- Inserting procedures...');
  const procedures = seedHelpers.getProceduresToInsert(
    Array.from(dataMap.values())
  );

  const { errors: insertProcedureErrors } = await seedHelpers.insertProcedures(
    Array.from(procedures.values())
  );
  if (insertProcedureErrors && insertProcedureErrors.length > 0) {
    console.warn('Errors inserting procedures:');
    for (const error of insertProcedureErrors) {
      console.error(error);
    }
    process.exit(1);
  }

  // INSERT MAX ALLOWED DAYS
  console.info('--- Inserting max waiting periods...');
  await seedHelpers.insertMaxAllowedDays(dataMap);

  // INSERT INSTITUTIONS AKA FACILITIES
  console.info('--- Inserting institutions...');
  await seedHelpers.insertInstitutions(dataMap);

  // INSERT WAITING PERIODS
  console.info('--- Inserting waiting periods...');
  await seedHelpers.insertWaitingTimes(dataMap);

  console.info('--- Database seeded successfully!');
  process.exit(0);
};
