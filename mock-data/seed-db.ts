/* eslint-disable drizzle/enforce-delete-with-where */
/* eslint-disable no-console */
import { type InsertProcedure } from '@/db/schema/procedures';
import fs from 'fs/promises';
import { cwd } from 'process';

import { seedHelpers } from './seed-helpers';

const dirName = `${cwd()}/mock-data/data`;
const getDataFileNames = async () => await fs.readdir('./mock-data/data');

const seedDB = async () => {
  console.info('--- Seeding database...');
  console.info('--- Deleting tables...');
  const deletingResult = await seedHelpers.deleteTables();
  if (!deletingResult.success) {
    console.warn('Error deleting tables: ', deletingResult.error.message);
    console.error(deletingResult.error);
    process.exit(1);
  }

  // GET DATA FROM FILES
  console.info('--- Reading data from files...');
  const fileNames = await getDataFileNames();
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
  const procedures: Map<
    string,
    Pick<InsertProcedure, 'code' | 'name'>
  > = seedHelpers.getProceduresToInsert(Array.from(dataMap.values()));

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
};

seedDB();