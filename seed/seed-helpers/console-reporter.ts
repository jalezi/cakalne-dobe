/** biome-ignore-all lint/suspicious/noConsole: This module is for terminal output */

import { formatDateForDisplay } from './date-range-calculator';

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

/**
 * Status icons
 */
const icons = {
  success: '✓',
  warning: '⚠️',
  error: '✗',
  info: 'ℹ',
  arrow: '→',
};

/**
 * Helper to colorize text
 */
function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Creates a visual separator line
 */
function separator(char = '─', length = 60): string {
  return char.repeat(length);
}

/**
 * Creates a section header
 */
function sectionHeader(title: string): string {
  return `\n${colorize(separator('═'), 'cyan')}\n${colorize(title, 'bright')}\n${colorize(separator('─'), 'cyan')}`;
}

/**
 * Reports database coverage information
 */
export function reportDatabaseCoverage(
  earliest: Date | null,
  latest: Date | null,
  jobCount: number
): void {
  console.log(sectionHeader('📊 Current Database Coverage'));

  if (jobCount === 0) {
    console.log(
      colorize(`${icons.warning} No data found in database`, 'yellow')
    );
    console.log(colorize('  Database is empty', 'dim'));
    return;
  }

  console.log(
    colorize(`${icons.success} Jobs in database: ${jobCount}`, 'green')
  );

  if (earliest && latest) {
    console.log(
      `  ${colorize('Earliest:', 'dim')} ${formatDateForDisplay(earliest)}`
    );
    console.log(
      `  ${colorize('Latest:', 'dim')} ${formatDateForDisplay(latest)}`
    );

    const daysCovered = Math.ceil(
      (latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)
    );
    console.log(`  ${colorize('Days covered:', 'dim')} ${daysCovered}`);
  }
}

/**
 * Reports required coverage based on 3-month rule
 */
export function reportRequiredCoverage(
  requiredStart: Date,
  requiredEnd: Date
): void {
  console.log(sectionHeader('📅 Required Coverage (Last 3 Months)'));

  console.log(
    `  ${colorize('Required from:', 'dim')} ${formatDateForDisplay(requiredStart)}`
  );
  console.log(
    `  ${colorize('Required to:', 'dim')} ${formatDateForDisplay(requiredEnd)}`
  );

  const daysRequired = Math.ceil(
    (requiredEnd.getTime() - requiredStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  console.log(`  ${colorize('Days required:', 'dim')} ${daysRequired}`);
}

/**
 * Reports available job files
 */
export function reportAvailableFiles(
  files: string[],
  earliest: Date | null,
  latest: Date | null
): void {
  console.log(sectionHeader('📁 Available Job Files'));

  if (files.length === 0) {
    console.log(
      colorize(
        `${icons.warning} No job files found in mock-data/jobs/`,
        'yellow'
      )
    );
    return;
  }

  console.log(
    colorize(`${icons.success} Found ${files.length} job file(s)`, 'green')
  );

  if (earliest && latest) {
    console.log(
      `  ${colorize('Earliest:', 'dim')} ${formatDateForDisplay(earliest)}`
    );
    console.log(
      `  ${colorize('Latest:', 'dim')} ${formatDateForDisplay(latest)}`
    );
  }

  // Show first few and last few files if there are many
  if (files.length <= 5) {
    files.forEach((file) => {
      console.log(`  ${colorize(icons.arrow, 'gray')} ${file}`);
    });
  } else {
    files.slice(0, 2).forEach((file) => {
      console.log(`  ${colorize(icons.arrow, 'gray')} ${file}`);
    });
    console.log(colorize(`  ... ${files.length - 4} more files ...`, 'dim'));
    files.slice(-2).forEach((file) => {
      console.log(`  ${colorize(icons.arrow, 'gray')} ${file}`);
    });
  }
}

/**
 * Reports validation status with status icons
 */
export function reportValidationStatus(isValid: boolean, gaps: string[]): void {
  console.log(sectionHeader('🔍 Validation Status'));

  if (isValid) {
    console.log(
      colorize(
        `${icons.success} Coverage is adequate - meets 3-month requirement`,
        'green'
      )
    );
  } else {
    console.log(
      colorize(
        `${icons.error} Coverage is inadequate - missing required data`,
        'red'
      )
    );

    if (gaps.length > 0) {
      console.log(colorize('\n  Identified gaps:', 'yellow'));
      gaps.forEach((gap) => {
        console.log(`  ${colorize(icons.warning, 'yellow')} ${gap}`);
      });
    }
  }
}

/**
 * Reports seeding progress
 */
export function reportSeedingProgress(
  filesProcessed: number,
  totalFiles: number,
  currentFile: string
): void {
  const percentage = Math.round((filesProcessed / totalFiles) * 100);
  const bar = '█'.repeat(Math.floor(percentage / 2));
  const empty = '░'.repeat(50 - Math.floor(percentage / 2));

  process.stdout.write(
    `\r${colorize(`Seeding: [${bar}${empty}] ${percentage}%`, 'cyan')} - ${colorize(currentFile, 'dim')}`
  );

  // Add newline when complete
  if (filesProcessed === totalFiles) {
    console.log('');
  }
}

/**
 * Generates a summary report combining all sections
 */
export interface SummaryReportData {
  databaseCoverage: {
    earliest: Date | null;
    latest: Date | null;
    jobCount: number;
  };
  requiredCoverage: {
    requiredStart: Date;
    requiredEnd: Date;
  };
  availableFiles: {
    files: string[];
    earliest: Date | null;
    latest: Date | null;
  };
  validationStatus: {
    isValid: boolean;
    gaps: string[];
  };
}

export function generateSummaryReport(data: SummaryReportData): void {
  console.log('\n');
  console.log(colorize('═'.repeat(60), 'bright'));
  console.log(colorize('     📊 DATABASE DATA COVERAGE REPORT', 'bright'));
  console.log(colorize('═'.repeat(60), 'bright'));

  reportDatabaseCoverage(
    data.databaseCoverage.earliest,
    data.databaseCoverage.latest,
    data.databaseCoverage.jobCount
  );

  reportRequiredCoverage(
    data.requiredCoverage.requiredStart,
    data.requiredCoverage.requiredEnd
  );

  reportAvailableFiles(
    data.availableFiles.files,
    data.availableFiles.earliest,
    data.availableFiles.latest
  );

  reportValidationStatus(
    data.validationStatus.isValid,
    data.validationStatus.gaps
  );

  console.log('\n' + colorize(separator('═'), 'bright') + '\n');
}

/**
 * Reports final summary after seeding operations
 */
export function reportFinalSummary(
  seededCount: number,
  skippedCount: number,
  errorCount: number
): void {
  console.log(sectionHeader('✨ Seeding Complete'));

  console.log(
    colorize(`  ${icons.success} Successfully seeded: ${seededCount}`, 'green')
  );
  console.log(
    colorize(`  ${icons.info} Skipped (existing): ${skippedCount}`, 'blue')
  );

  if (errorCount > 0) {
    console.log(
      colorize(`  ${icons.error} Errors encountered: ${errorCount}`, 'red')
    );
  }

  console.log('');
}
