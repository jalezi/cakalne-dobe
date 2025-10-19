import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { count, eq, max, min } from 'drizzle-orm';
import { db } from '@/db';
import { jobs } from '@/db/schema';
import {
  calculateThreeMonthsBack,
  extractDateFromJobFilename,
} from './date-range-calculator';

/**
 * Result type for available jobs date range scan
 */
export interface AvailableJobsDateRange {
  earliest: Date | null;
  latest: Date | null;
  files: string[];
}

/**
 * Result type for database date range query
 */
export interface DatabaseDateRange {
  earliest: Date | null;
  latest: Date | null;
  jobCount: number;
}

/**
 * Result type for three-month requirement validation
 */
export interface ValidationResult {
  isValid: boolean;
  requiredStart: Date;
  requiredEnd: Date;
  gaps: string[];
}

/**
 * Scans the mock-data/jobs/ directory for available job files
 * Filters out archived files and non-JSON files
 * @returns Object containing earliest/latest dates and list of valid files
 */
export async function getAvailableJobsDateRange(): Promise<AvailableJobsDateRange> {
  const jobsDir = join(process.cwd(), 'mock-data', 'jobs');

  try {
    // Read directory contents
    const allFiles = await readdir(jobsDir);

    // Filter valid JSON files (exclude .DS_Store, directories, etc.)
    const jsonFiles = allFiles.filter(
      (file) => file.endsWith('.json') && file.startsWith('wp-')
    );

    if (jsonFiles.length === 0) {
      return {
        earliest: null,
        latest: null,
        files: [],
      };
    }

    // Parse dates from filenames and create file-date pairs
    const fileDatePairs: Array<{ file: string; date: Date }> = [];

    for (const file of jsonFiles) {
      const date = extractDateFromJobFilename(file);
      if (date) {
        fileDatePairs.push({ file, date });
      }
    }

    if (fileDatePairs.length === 0) {
      return {
        earliest: null,
        latest: null,
        files: [],
      };
    }

    // Sort by date (ascending)
    fileDatePairs.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Extract earliest and latest dates
    const earliest = fileDatePairs[0].date;
    const latest = fileDatePairs[fileDatePairs.length - 1].date;

    // Return sorted file list
    const sortedFiles = fileDatePairs.map((pair) => pair.file);

    return {
      earliest,
      latest,
      files: sortedFiles,
    };
  } catch (error) {
    // Handle directory read errors (e.g., directory doesn't exist)
    console.error('Error reading jobs directory:', error);
    return {
      earliest: null,
      latest: null,
      files: [],
    };
  }
}

/**
 * Validates whether the available data meets the 3-month requirement
 * @param latestDate - The most recent date in the available data
 * @param earliestDate - The oldest date in the available data
 * @returns Validation result with coverage status and any gaps identified
 */
export function validateThreeMonthRequirement(
  latestDate: Date,
  earliestDate: Date
): ValidationResult {
  // Calculate required start date (3 months before latest)
  const requiredStart = calculateThreeMonthsBack(latestDate);
  const requiredEnd = latestDate;

  // Check if earliest date is before or equal to required start
  const isValid = earliestDate <= requiredStart;

  // Identify gaps (simplified - checks if earliest is within required range)
  const gaps: string[] = [];

  if (!isValid) {
    const daysMissing = Math.ceil(
      (requiredStart.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    gaps.push(
      `Missing ${Math.abs(daysMissing)} days of data before ${earliestDate.toISOString().split('T')[0]}`
    );
  }

  return {
    isValid,
    requiredStart,
    requiredEnd,
    gaps,
  };
}

/**
 * Queries the database for the date range of existing jobs
 * @returns Object containing earliest/latest job dates and total job count
 */
export async function getDatabaseDateRange(): Promise<DatabaseDateRange> {
  try {
    const result = await db
      .select({
        earliest: min(jobs.startDate),
        latest: max(jobs.startDate),
        jobCount: count(jobs.id),
      })
      .from(jobs);

    const row = result[0];

    if (!row || row.jobCount === 0) {
      return {
        earliest: null,
        latest: null,
        jobCount: 0,
      };
    }

    return {
      earliest: row.earliest ? new Date(row.earliest) : null,
      latest: row.latest ? new Date(row.latest) : null,
      jobCount: row.jobCount,
    };
  } catch (error) {
    console.error('Error querying database date range:', error);
    return {
      earliest: null,
      latest: null,
      jobCount: 0,
    };
  }
}

/**
 * Checks if a job with the given GitLab Job ID already exists in the database
 * @param gitLabJobId - The GitLab Job ID to check
 * @returns True if the job exists, false otherwise
 */
export async function checkJobExists(gitLabJobId: string): Promise<boolean> {
  try {
    const result = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(eq(jobs.gitLabJobId, gitLabJobId))
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error('Error checking if job exists:', error);
    return false;
  }
}
