/** biome-ignore-all lint/suspicious/noConsole: We need for debug */
import fs from 'fs/promises';
import { cwd } from 'process';

import { ingestSnapshot } from './ingest-snapshot';
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

  console.info('--- Ingesting snapshots...');
  for (const [gitLabJobId, jobData] of Array.from(dataMap.entries())) {
    try {
      await ingestSnapshot(jobData, gitLabJobId);
    } catch (error) {
      console.warn(`Errors ingesting snapshot ${gitLabJobId}:`);
      console.error(error);
      process.exit(1);
    }
  }

  console.info('--- Database seeded successfully!');
  process.exit(0);
};
