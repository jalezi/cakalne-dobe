/** biome-ignore-all lint/suspicious/noConsole: This module is for seeding scripts */

import { join } from 'node:path';
import { db } from '@/db';
import { ingestSnapshot } from '@/snapshot';
import { INGEST_SNAPSHOT_ERRORS } from '@/snapshot/ingest';
import {
  extractDateFromJobFilename,
  isWithinRange,
} from './date-range-calculator';
import { getDataFromFiles } from './get-data-from-file';
import type { CustomError } from './types';

/**
 * Result type for seeding operations
 */
export interface SeedingResult {
  seeded: number;
  skipped: number;
  errors: CustomError[];
}

/**
 * Filters available job files to only include those within the required date range
 * @param availableFiles - List of all available job filenames
 * @param requiredStartDate - Start of the required date range (3 months ago)
 * @param requiredEndDate - End of the required date range (latest date)
 * @returns Filtered list of filenames within the date range
 */
export function getJobsToSeed(
  availableFiles: string[],
  requiredStartDate: Date,
  requiredEndDate: Date
): string[] {
  const filesInRange: string[] = [];

  for (const file of availableFiles) {
    const date = extractDateFromJobFilename(file);
    if (date && isWithinRange(date, requiredStartDate, requiredEndDate)) {
      filesInRange.push(file);
    }
  }

  return filesInRange;
}

/**
 * Seeds only missing jobs from the provided job files
 * Skips a job whose GitLab job ID or day is already stored
 * @param jobFiles - Array of job filenames to process
 * @param jobsDir - Directory holding the job files (default: mock-data/jobs)
 * @returns Object containing seeding statistics (seeded, skipped, errors)
 */
export async function seedMissingJobsOnly(
  jobFiles: string[],
  jobsDir = join(process.cwd(), 'mock-data', 'jobs')
): Promise<SeedingResult> {
  const result: SeedingResult = {
    seeded: 0,
    skipped: 0,
    errors: [],
  };

  if (jobFiles.length === 0) {
    return result;
  }

  // Load data from files
  const { data: dataMap, errors: loadErrors } = await getDataFromFiles(
    jobFiles,
    jobsDir
  );

  if (loadErrors) {
    result.errors.push(...loadErrors);
  }

  // Process each job
  for (const [jobId, jobData] of dataMap.entries()) {
    try {
      // Seed the job with all related data in one transaction
      const ingested = await ingestSnapshot(db, jobId, jobData);
      // Its GitLab job ID or its day is already stored (ADR-0002)
      if (
        !ingested.success &&
        ingested.error.code === INGEST_SNAPSHOT_ERRORS.JOB_EXISTS
      ) {
        result.skipped++;
        console.log(`  ⏭️  Skipping existing job: ${jobId}`);
        continue;
      }
      if (!ingested.success) {
        throw new Error(ingested.error.message);
      }

      console.log(`  ✨ Seeded new job: ${jobId}`);
      result.seeded++;
    } catch (error) {
      console.error(`  ❌ Error seeding job ${jobId}:`, error);
      result.errors.push({
        error: error instanceof Error ? error : new Error(String(error)),
        meta: { jobId },
      });
    }
  }

  return result;
}
