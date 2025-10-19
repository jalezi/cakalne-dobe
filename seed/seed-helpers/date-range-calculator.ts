import {
  differenceInDays,
  format,
  isWithinInterval,
  subMonths,
} from 'date-fns';

/**
 * Calculates the date that is 3 months before the given date
 * @param fromDate - The date to subtract from
 * @returns Date that is 3 months before the input date
 */
export function calculateThreeMonthsBack(fromDate: Date): Date {
  return subMonths(fromDate, 3);
}

/**
 * Formats a date for consistent display across the application
 * @param date - The date to format
 * @returns Formatted date string in YYYY-MM-DD format
 */
export function formatDateForDisplay(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Extracts date from job filename following the pattern: wp-YYYY-MM-DD-HH-MM-SS-*.json
 * @param filename - The job filename to parse
 * @returns Parsed Date object or null if parsing fails
 * @example
 * extractDateFromJobFilename('wp-2024-06-07-05-12-11-7041049865.json')
 * // returns Date object for 2024-06-07 05:12:11
 */
export function extractDateFromJobFilename(filename: string): Date | null {
  // Pattern: wp-YYYY-MM-DD-HH-MM-SS-*.json
  const pattern =
    /^wp-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-\d+\.json$/;
  const match = filename.match(pattern);

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match;

  // Create date with parsed components
  const date = new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1, // Months are 0-indexed in JavaScript
    parseInt(day, 10),
    parseInt(hour, 10),
    parseInt(minute, 10),
    parseInt(second, 10)
  );

  // Validate that the date is valid
  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * Calculates the difference in days between two dates
 * @param startDate - The earlier date
 * @param endDate - The later date
 * @returns Number of days between the dates (can be negative if startDate > endDate)
 */
export function calculateDateDifference(
  startDate: Date,
  endDate: Date
): number {
  return differenceInDays(endDate, startDate);
}

/**
 * Checks if a date falls within a given date range (inclusive)
 * @param date - The date to check
 * @param startDate - The start of the range (inclusive)
 * @param endDate - The end of the range (inclusive)
 * @returns True if the date is within the range, false otherwise
 */
export function isWithinRange(
  date: Date,
  startDate: Date,
  endDate: Date
): boolean {
  return isWithinInterval(date, { start: startDate, end: endDate });
}
