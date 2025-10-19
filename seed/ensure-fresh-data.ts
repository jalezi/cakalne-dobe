/** biome-ignore-all lint/suspicious/noConsole: This is a CLI script */

import { ENV_SERVER_VARS } from '@/lib/env';
import {
  generateSummaryReport,
  reportFinalSummary,
} from './seed-helpers/console-reporter';
import { formatDateForDisplay } from './seed-helpers/date-range-calculator';
import {
  getJobsToSeed,
  seedMissingJobsOnly,
} from './seed-helpers/smart-seeding';
import {
  getAvailableJobsDateRange,
  getDatabaseDateRange,
  validateThreeMonthRequirement,
} from './seed-helpers/validate-data-coverage';

/**
 * Determines the database environment from the DATABASE_URL
 */
function getDatabaseEnvironment(): string {
  const dbUrl = ENV_SERVER_VARS.DATABASE_URL;

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
 * Main function that orchestrates the entire data coverage check and seeding process
 */
async function ensureFreshData(): Promise<void> {
  let exitCode = 0;

  try {
    // Step 1: Display header banner with database info
    console.log('\n');
    console.log('═'.repeat(60));
    console.log('📊 Checking Local Database Data Coverage...');
    console.log('═'.repeat(60));
    console.log(`\n${getDatabaseEnvironment()}`);
    console.log(`🔗 ${ENV_SERVER_VARS.DATABASE_URL}\n`); // Step 2: Query database for current coverage
    console.log('🔍 Querying database...');
    const dbCoverage = await getDatabaseDateRange();

    // Step 3: Scan available JSON files
    console.log('📁 Scanning available job files...');
    const availableFiles = await getAvailableJobsDateRange();

    if (availableFiles.files.length === 0) {
      console.error('❌ No job files found in mock-data/jobs/');
      console.error(
        '   Please ensure job files exist before running this command.'
      );
      process.exit(1);
    }

    if (!availableFiles.latest || !availableFiles.earliest) {
      console.error('❌ Could not determine date range from available files');
      process.exit(1);
    }

    // Step 4: Validate 3-month requirement and identify gaps
    console.log('✅ Validating 3-month requirement...');
    const validation = validateThreeMonthRequirement(
      availableFiles.latest,
      availableFiles.earliest
    );

    // Step 5: Display comprehensive report
    generateSummaryReport({
      databaseCoverage: {
        earliest: dbCoverage.earliest,
        latest: dbCoverage.latest,
        jobCount: dbCoverage.jobCount,
      },
      requiredCoverage: {
        requiredStart: validation.requiredStart,
        requiredEnd: validation.requiredEnd,
      },
      availableFiles: {
        files: availableFiles.files,
        earliest: availableFiles.earliest,
        latest: availableFiles.latest,
      },
      validationStatus: {
        isValid: validation.isValid,
        gaps: validation.gaps,
      },
    });

    // Step 6: Determine which files need seeding
    const filesToSeed = getJobsToSeed(
      availableFiles.files,
      validation.requiredStart,
      validation.requiredEnd
    );

    console.log('\n🔧 Checking for missing data...');
    console.log(
      `   Found ${filesToSeed.length} file(s) within required date range`
    );

    if (filesToSeed.length === 0) {
      console.log('✅ No files to seed - coverage is up to date!');
      process.exit(0);
    }

    // Step 7: Execute smart seeding for missing jobs only
    console.log('\n🌱 Starting smart seeding process...');
    console.log(
      `   Processing ${filesToSeed.length} file(s) (skipping existing jobs)\n`
    );

    const seedingResult = await seedMissingJobsOnly(filesToSeed);

    // Step 8: Display final summary with results
    console.log('\n');
    reportFinalSummary(
      seedingResult.seeded,
      seedingResult.skipped,
      seedingResult.errors.length
    );

    // Display before/after comparison
    if (seedingResult.seeded > 0) {
      const afterDbCoverage = await getDatabaseDateRange();
      console.log('📊 Database Coverage Update:');
      console.log(
        `   Before: ${dbCoverage.jobCount} jobs | ${dbCoverage.earliest ? formatDateForDisplay(dbCoverage.earliest) : 'N/A'} - ${dbCoverage.latest ? formatDateForDisplay(dbCoverage.latest) : 'N/A'}`
      );
      console.log(
        `   After:  ${afterDbCoverage.jobCount} jobs | ${afterDbCoverage.earliest ? formatDateForDisplay(afterDbCoverage.earliest) : 'N/A'} - ${afterDbCoverage.latest ? formatDateForDisplay(afterDbCoverage.latest) : 'N/A'}`
      );
      console.log('');
    }

    // Check for errors and set exit code
    if (seedingResult.errors.length > 0) {
      console.error('⚠️  Warning: Some errors occurred during seeding:');
      for (const error of seedingResult.errors.slice(0, 5)) {
        console.error(`   - ${error.error.message}`);
        if (error.meta) {
          console.error(`     Meta: ${JSON.stringify(error.meta)}`);
        }
      }
      if (seedingResult.errors.length > 5) {
        console.error(
          `   ... and ${seedingResult.errors.length - 5} more errors`
        );
      }
      exitCode = 1;
    }

    // Final status message
    if (exitCode === 0) {
      console.log('✅ Data coverage check completed successfully!\n');
    } else {
      console.log('⚠️  Data coverage check completed with warnings.\n');
    }
  } catch (error) {
    console.error('\n❌ Fatal error during data coverage check:');
    console.error(error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    exitCode = 1;
  }

  // Exit with appropriate status code
  process.exit(exitCode);
}

// Run if this is the main module
if (require.main === module) {
  ensureFreshData();
}

export { ensureFreshData };
