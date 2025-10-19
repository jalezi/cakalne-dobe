#!/usr/bin/env node

/** biome-ignore-all lint/suspicious/noConsole: This is a CLI script */

/**
 * Script to fetch job artifacts from GitLab CI/CD pipeline
 *
 * Usage:
 *   pnpm fetch:jobs                          # Fetch 10 latest jobs (default)
 *   pnpm fetch:jobs --count 20               # Fetch 20 latest jobs
 *   pnpm fetch:jobs --from-date 2024-03-01   # Fetch jobs from specific date
 *   pnpm fetch:jobs --output ./custom/path   # Save to custom directory
 */

import { constants } from 'node:fs';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { JOB_NAME } from '@/lib/gql';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import { getJobs } from '@/utils/get-jobs';
import { getJson } from '@/utils/get-json';

interface FetchJobsOptions {
  count?: number;
  fromDate?: Date;
  outputDir?: string;
}

/**
 * Extract job ID from GitLab detailsPath
 * Example: "/wayback-automachine/cakalne-dobe/-/jobs/7041049865" -> "7041049865"
 */
function extractJobId(detailsPath: string): string {
  const match = detailsPath.match(/\/jobs\/(\d+)/);
  if (!match || !match[1]) {
    throw new Error(`Could not extract job ID from path: ${detailsPath}`);
  }
  return match[1];
}

/**
 * Format job date to filename format: YYYY-MM-DD-HH-MM-SS
 */
function formatJobDate(finishedAt: string): string {
  const date = new Date(finishedAt);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
}

/**
 * Generate filename for job artifact
 * Pattern: wp-YYYY-MM-DD-HH-MM-SS-{JOB_ID}.json
 */
function generateFilename(jobId: string, finishedAt: string): string {
  const dateStr = formatJobDate(finishedAt);
  return `wp-${dateStr}-${jobId}.json`;
}

/**
 * Fetch job artifact from GitLab Pages
 */
async function fetchJobArtifact(jobId: string): Promise<AllData> {
  // getJson returns AllData directly or throws an error
  const artifact = await getJson(jobId);
  return artifact;
}

/**
 * Check if a file already exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Save job artifact to file
 */
async function saveJobArtifact(
  data: unknown,
  outputDir: string,
  filename: string
): Promise<void> {
  await mkdir(outputDir, { recursive: true });
  const filePath = join(outputDir, filename);
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Fetch jobs from GitLab and save artifacts to local files
 */
async function fetchJobs(options: FetchJobsOptions = {}): Promise<void> {
  const { count = 10, fromDate, outputDir = './mock-data/jobs' } = options;

  console.log('\n🚀 Fetching jobs from GitLab...\n');
  console.log('  Repository: wayback-automachine/cakalne-dobe');
  if (fromDate) {
    console.log(`  From Date: ${fromDate.toISOString()}`);
  }
  console.log(`  Count: ${count}`);
  console.log(`  Output: ${outputDir}\n`);

  // Fetch job list from GitLab GraphQL API
  console.log('📋 Fetching job list from GitLab GraphQL API...');
  const jobsResponse = await getJobs({ first: count });

  if (!jobsResponse.success) {
    const errorMessage = !jobsResponse.success
      ? jobsResponse.error
      : 'Unknown error';
    throw new Error(`Failed to fetch jobs: ${errorMessage}`);
  }

  const jobs = jobsResponse.data.jobs.nodes;

  // Filter jobs: only "run" jobs have artifacts
  const runJobs = jobs.filter((job) => job.name === JOB_NAME);

  // Apply date filter if provided
  const filteredJobs = fromDate
    ? runJobs.filter((job) => new Date(job.finishedAt) >= fromDate)
    : runJobs;

  console.log(
    `📦 Processing ${filteredJobs.length} job(s) (filtered to '${JOB_NAME}' jobs)...\n`
  );

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const job of filteredJobs) {
    try {
      const jobId = extractJobId(job.detailedStatus.detailsPath);
      const filename = generateFilename(jobId, job.finishedAt);
      const filePath = join(outputDir, filename);

      // Check if file already exists
      if (await fileExists(filePath)) {
        console.log(`  ⏭️  Skipped: ${filename} (already exists)\n`);
        skippedCount++;
        continue;
      }

      console.log(`  ⏳ Fetching job ${jobId} (${job.finishedAt})...`);

      const artifact = await fetchJobArtifact(jobId);
      await saveJobArtifact(artifact, outputDir, filename);

      console.log(`  ✅ Saved: ${filename}\n`);
      successCount++;
    } catch (error) {
      console.error(
        `  ❌ Error processing job: ${error instanceof Error ? error.message : String(error)}\n`
      );
      errorCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ⏭️  Skipped: ${skippedCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  📁 Output: ${outputDir}\n`);
}

/**
 * Parse command line arguments
 */
function parseArgs(): FetchJobsOptions {
  const args = process.argv.slice(2);
  const options: FetchJobsOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--count' && i + 1 < args.length) {
      options.count = Number.parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--from-date' && i + 1 < args.length) {
      options.fromDate = new Date(args[i + 1]);
      i++;
    } else if (arg === '--output' && i + 1 < args.length) {
      options.outputDir = args[i + 1];
      i++;
    }
  }

  return options;
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      const options = parseArgs();
      await fetchJobs(options);
    } catch (error) {
      console.error(
        '\n❌ Fatal error:',
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  })();
}
export { fetchJobs, extractJobId, formatJobDate, generateFilename };
