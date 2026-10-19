/** biome-ignore-all lint/suspicious/noConsole: This is a CLI script */

import { join } from 'node:path';
import { ENV_SERVER_VARS } from '@/lib/env';
import {
  generateSummaryReport,
  reportFinalSummary,
} from './seed-helpers/console-reporter';
import { formatDateForDisplay } from './seed-helpers/date-range-calculator';
import {
  getJobsToSeed,
  type SeedingResult,
  seedMissingJobsOnly,
} from './seed-helpers/smart-seeding';
import type { CustomError } from './seed-helpers/types';
import {
  type AvailableJobsDateRange,
  type DatabaseDateRange,
  getAvailableJobsDateRange,
  getDatabaseDateRange,
  type ValidationResult,
  validateThreeMonthRequirement,
} from './seed-helpers/validate-data-coverage';

/**
 * What the planning step works out before anything is seeded
 */
interface SeedPlan {
  dbCoverage: DatabaseDateRange;
  availableFiles: AvailableJobsDateRange;
  validation: ValidationResult;
  filesToSeed: string[];
}

/**
 * Determines the database environment from the DATABASE_URL
 */
export function getDatabaseEnvironment(dbUrl: string): string {
  if (dbUrl.includes('file:') || dbUrl.includes('dev.db')) {
    return '🗄️  Local File Database (dev.db)';
  }
  if (dbUrl.includes('prod.db')) {
    return '🗄️  Production File Database (prod.db)';
  }
  if (dbUrl.includes('turso') || dbUrl.includes('libsql')) {
    return '☁️  Turso Cloud Database';
  }

  return '🗄️  Database';
}

/**
 * Works out database coverage, the job files and the files to seed
 * @returns The plan, or the message to print when there is nothing to plan from
 */
export async function planSeeding(
  jobsDir: string
): Promise<SeedPlan | { error: string[] }> {
  console.log('🔍 Querying database...');
  const dbCoverage = await getDatabaseDateRange();

  console.log('📁 Scanning available job files...');
  const availableFiles = await getAvailableJobsDateRange(jobsDir);
  const { earliest, latest } = availableFiles;

  if (availableFiles.files.length === 0) {
    return {
      error: [
        '❌ No job files found in mock-data/jobs/',
        '   Please ensure job files exist before running this command.',
      ],
    };
  }

  if (!latest || !earliest) {
    return {
      error: ['❌ Could not determine date range from available files'],
    };
  }

  console.log('✅ Validating 3-month requirement...');
  const validation = validateThreeMonthRequirement(latest, earliest);
  const filesToSeed = getJobsToSeed(
    availableFiles.files,
    validation.requiredStart,
    validation.requiredEnd
  );

  return { dbCoverage, availableFiles, validation, filesToSeed };
}

function reportHeader(dbUrl: string): void {
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('📊 Checking Local Database Data Coverage...');
  console.log('═'.repeat(60));
  console.log(`\n${getDatabaseEnvironment(dbUrl)}`);
  console.log(`🔗 ${dbUrl}\n`);
}

function reportPlan({
  dbCoverage,
  availableFiles,
  validation,
  filesToSeed,
}: SeedPlan): void {
  generateSummaryReport({
    databaseCoverage: dbCoverage,
    requiredCoverage: validation,
    availableFiles,
    validationStatus: validation,
  });

  console.log('\n🔧 Checking for missing data...');
  console.log(
    `   Found ${filesToSeed.length} file(s) within required date range`
  );
}

function formatCoverage({
  jobCount,
  earliest,
  latest,
}: DatabaseDateRange): string {
  return `${jobCount} jobs | ${earliest ? formatDateForDisplay(earliest) : 'N/A'} - ${latest ? formatDateForDisplay(latest) : 'N/A'}`;
}

function reportCoverageChange(
  before: DatabaseDateRange,
  after: DatabaseDateRange
): void {
  console.log('📊 Database Coverage Update:');
  console.log(`   Before: ${formatCoverage(before)}`);
  console.log(`   After:  ${formatCoverage(after)}`);
  console.log('');
}

function reportSeedingErrors(errors: CustomError[]): void {
  console.error('⚠️  Warning: Some errors occurred during seeding:');
  for (const error of errors.slice(0, 5)) {
    console.error(`   - ${error.error.message}`);
    if (error.meta) {
      console.error(`     Meta: ${JSON.stringify(error.meta)}`);
    }
  }
  if (errors.length > 5) {
    console.error(`   ... and ${errors.length - 5} more errors`);
  }
}

/**
 * Prints the seeding result
 * @returns The exit code: 1 when any job failed, else 0
 */
async function reportSeedingResult(
  { seeded, skipped, errors }: SeedingResult,
  dbCoverage: DatabaseDateRange
): Promise<number> {
  console.log('\n');
  reportFinalSummary(seeded, skipped, errors.length);

  if (seeded > 0) {
    reportCoverageChange(dbCoverage, await getDatabaseDateRange());
  }

  if (errors.length > 0) {
    reportSeedingErrors(errors);
    console.log('⚠️  Data coverage check completed with warnings.\n');
    return 1;
  }

  console.log('✅ Data coverage check completed successfully!\n');
  return 0;
}

function reportFatalError(error: unknown): void {
  console.error('\n❌ Fatal error during data coverage check:');
  console.error(error instanceof Error ? error.message : String(error));
  if (error instanceof Error && error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
}

/**
 * Main function that orchestrates the entire data coverage check and seeding process
 * @param jobsDir - Directory holding the job files (default: mock-data/jobs)
 * @returns The process exit code
 */
async function ensureFreshData(
  jobsDir = join(process.cwd(), 'mock-data', 'jobs')
): Promise<number> {
  try {
    reportHeader(ENV_SERVER_VARS.DATABASE_URL);

    const plan = await planSeeding(jobsDir);

    if ('error' in plan) {
      for (const line of plan.error) {
        console.error(line);
      }
      return 1;
    }

    reportPlan(plan);

    if (plan.filesToSeed.length === 0) {
      console.log('✅ No files to seed - coverage is up to date!');
      return 0;
    }

    console.log('\n🌱 Starting smart seeding process...');
    console.log(
      `   Processing ${plan.filesToSeed.length} file(s) (skipping existing jobs)\n`
    );

    const seedingResult = await seedMissingJobsOnly(plan.filesToSeed, jobsDir);

    return await reportSeedingResult(seedingResult, plan.dbCoverage);
  } catch (error) {
    reportFatalError(error);
    return 1;
  }
}

// Run if this is the main module
if (require.main === module) {
  ensureFreshData().then((exitCode) => process.exit(exitCode));
}

export { ensureFreshData };
