/** biome-ignore-all lint/suspicious/noConsole: We need for debug */

import { join } from 'node:path';
import fs from 'fs/promises';

import { db } from '@/db';
import { ingestSnapshot } from '@/snapshot';
import { seedHelpers } from './seed-helpers';
import type { CustomError } from './seed-helpers/types';
import { checkJobExists } from './seed-helpers/validate-data-coverage';

type SeedFromJobsResult = {
  seeded: number;
  skipped: number;
  errors: CustomError[];
};

export const seedDBFromJobs = async (
  input: boolean = false,
  jobsDir = join(process.cwd(), 'mock-data', 'jobs')
): Promise<SeedFromJobsResult> => {
  console.info('--- Seeding database from jobs...');
  const result: SeedFromJobsResult = { seeded: 0, skipped: 0, errors: [] };

  if (input) {
    console.info('--- Deleting tables...');
    const deletingResult = await seedHelpers.deleteTables();
    if (!deletingResult.success) {
      console.warn('Error deleting tables: ', deletingResult.error.message);
      console.error(deletingResult.error);
      result.errors.push({ error: deletingResult.error });
      return result;
    }
  }

  // GET DATA FROM FILES
  console.info('--- Reading data from files...');
  const fileNames = await fs
    .readdir(jobsDir)
    .then((files) =>
      files.filter(
        (file) => file.endsWith('.json') && !file.startsWith('archive')
      )
    );

  const { data: dataMap, errors: readingFileErrors } =
    await seedHelpers.getDataFromFiles(fileNames, jobsDir);
  if (readingFileErrors && readingFileErrors.length > 0) {
    console.warn('Errors reading files:');
    for (const error of readingFileErrors) {
      console.error(error);
    }
    result.errors.push(...readingFileErrors);
    return result;
  }

  console.info('--- Ingesting snapshots...');
  for (const [gitLabJobId, jobData] of Array.from(dataMap.entries())) {
    if (await checkJobExists(gitLabJobId)) {
      result.skipped++;
      continue;
    }

    const ingested = await ingestSnapshot(db, gitLabJobId, jobData);
    if (!ingested.success) {
      console.warn(`Errors ingesting snapshot ${gitLabJobId}:`);
      console.error(ingested.error);
      result.errors.push({
        error: new Error(ingested.error.message),
        meta: { jobId: gitLabJobId },
      });
      return result;
    }
    result.seeded++;
  }

  return result;
};
