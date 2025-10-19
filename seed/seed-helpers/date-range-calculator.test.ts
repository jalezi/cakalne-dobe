import { describe, expect, it } from 'vitest';
import {
  calculateDateDifference,
  calculateThreeMonthsBack,
  extractDateFromJobFilename,
  formatDateForDisplay,
  isWithinRange,
} from './date-range-calculator';

describe('date-range-calculator', () => {
  describe('calculateThreeMonthsBack', () => {
    it('should subtract 3 months from a given date', () => {
      const date = new Date(2024, 5, 7); // June 7, 2024
      const result = calculateThreeMonthsBack(date);
      const expected = new Date(2024, 2, 7); // March 7, 2024
      expect(result).toEqual(expected);
    });

    it('should handle end of month dates correctly', () => {
      const date = new Date(2024, 4, 31); // May 31, 2024
      const result = calculateThreeMonthsBack(date);
      const expected = new Date(2024, 1, 29); // Feb 29, 2024 (leap year)
      expect(result).toEqual(expected);
    });

    it('should handle leap year edge case', () => {
      const date = new Date(2024, 1, 29); // Feb 29, 2024
      const result = calculateThreeMonthsBack(date);
      const expected = new Date(2023, 10, 29); // Nov 29, 2023
      expect(result).toEqual(expected);
    });

    it('should handle year boundary crossing', () => {
      const date = new Date(2024, 0, 15); // Jan 15, 2024
      const result = calculateThreeMonthsBack(date);
      const expected = new Date(2023, 9, 15); // Oct 15, 2023
      expect(result).toEqual(expected);
    });

    it('should handle different month lengths', () => {
      const date = new Date(2024, 2, 31); // March 31, 2024
      const result = calculateThreeMonthsBack(date);
      const expected = new Date(2023, 11, 31); // December 31, 2023
      expect(result).toEqual(expected);
    });
  });

  describe('formatDateForDisplay', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date('2024-06-07T05:12:11');
      const result = formatDateForDisplay(date);
      expect(result).toBe('2024-06-07');
    });

    it('should pad single digit months and days with zeros', () => {
      const date = new Date('2024-01-05');
      const result = formatDateForDisplay(date);
      expect(result).toBe('2024-01-05');
    });

    it('should handle dates at year boundaries', () => {
      const date = new Date('2023-12-31');
      const result = formatDateForDisplay(date);
      expect(result).toBe('2023-12-31');
    });
  });

  describe('extractDateFromJobFilename', () => {
    it('should parse valid job filename correctly', () => {
      const filename = 'wp-2024-06-07-05-12-11-7041049865.json';
      const result = extractDateFromJobFilename(filename);
      expect(result).toEqual(new Date(2024, 5, 7, 5, 12, 11)); // Month is 0-indexed
    });

    it('should return null for invalid filename format', () => {
      const filename = 'invalid-filename.json';
      const result = extractDateFromJobFilename(filename);
      expect(result).toBeNull();
    });

    it('should return null for filename without wp prefix', () => {
      const filename = '2024-06-07-05-12-11-7041049865.json';
      const result = extractDateFromJobFilename(filename);
      expect(result).toBeNull();
    });

    it('should return null for filename without .json extension', () => {
      const filename = 'wp-2024-06-07-05-12-11-7041049865.txt';
      const result = extractDateFromJobFilename(filename);
      expect(result).toBeNull();
    });

    it('should return null for filename with wrong date format', () => {
      const filename = 'wp-24-06-07-05-12-11-7041049865.json';
      const result = extractDateFromJobFilename(filename);
      expect(result).toBeNull();
    });

    it('should handle different job IDs', () => {
      const filename = 'wp-2024-12-25-10-30-45-1234567890.json';
      const result = extractDateFromJobFilename(filename);
      expect(result).toEqual(new Date(2024, 11, 25, 10, 30, 45)); // Month is 0-indexed
    });
  });

  describe('calculateDateDifference', () => {
    it('should calculate positive difference when end date is later', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-10');
      const result = calculateDateDifference(startDate, endDate);
      expect(result).toBe(9);
    });

    it('should calculate negative difference when start date is later', () => {
      const startDate = new Date('2024-01-10');
      const endDate = new Date('2024-01-01');
      const result = calculateDateDifference(startDate, endDate);
      expect(result).toBe(-9);
    });

    it('should return 0 for same dates', () => {
      const date = new Date('2024-06-07');
      const result = calculateDateDifference(date, date);
      expect(result).toBe(0);
    });

    it('should handle dates across months', () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-02-15');
      const result = calculateDateDifference(startDate, endDate);
      expect(result).toBe(31); // January has 31 days
    });

    it('should handle dates across years', () => {
      const startDate = new Date('2023-12-25');
      const endDate = new Date('2024-01-05');
      const result = calculateDateDifference(startDate, endDate);
      expect(result).toBe(11);
    });

    it('should calculate 3 month difference (approximately 90 days)', () => {
      const startDate = new Date('2024-03-07');
      const endDate = new Date('2024-06-07');
      const result = calculateDateDifference(startDate, endDate);
      expect(result).toBe(92); // Mar(31-7)+Apr(30)+May(31)+Jun(7) = 24+30+31+7
    });
  });

  describe('isWithinRange', () => {
    it('should return true when date is within range', () => {
      const date = new Date('2024-06-15');
      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-06-30');
      const result = isWithinRange(date, startDate, endDate);
      expect(result).toBe(true);
    });

    it('should return true when date equals start date', () => {
      const date = new Date('2024-06-01');
      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-06-30');
      const result = isWithinRange(date, startDate, endDate);
      expect(result).toBe(true);
    });

    it('should return true when date equals end date', () => {
      const date = new Date('2024-06-30');
      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-06-30');
      const result = isWithinRange(date, startDate, endDate);
      expect(result).toBe(true);
    });

    it('should return false when date is before range', () => {
      const date = new Date('2024-05-31');
      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-06-30');
      const result = isWithinRange(date, startDate, endDate);
      expect(result).toBe(false);
    });

    it('should return false when date is after range', () => {
      const date = new Date('2024-07-01');
      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-06-30');
      const result = isWithinRange(date, startDate, endDate);
      expect(result).toBe(false);
    });

    it('should handle ranges across year boundaries', () => {
      const date = new Date('2024-01-15');
      const startDate = new Date('2023-12-15');
      const endDate = new Date('2024-02-15');
      const result = isWithinRange(date, startDate, endDate);
      expect(result).toBe(true);
    });
  });
});
