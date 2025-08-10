import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cn, getSiteUrl, disabaledDates } from './utils';
import { FIRST_DAY } from './constants';

describe('cn', () => {
    it('should merge class names correctly', () => {
        expect(cn('class1', 'class2')).toBe('class1 class2');
        expect(cn('class1', { class2: true, class3: false })).toBe('class1 class2');
        expect(cn('p-4', 'bg-red-500', 'text-white')).toBe('p-4 bg-red-500 text-white');

        // Test with Tailwind class conflicts that should be merged
        expect(cn('p-2', 'p-4')).toBe('p-4');

        // The exact order might vary based on the implementation of tailwind-merge
        // so we should test that both classes are present rather than exact order
        const result = cn('text-sm text-gray-500', 'text-lg');
        expect(result).toContain('text-lg');
        expect(result).toContain('text-gray-500');
    });
});

describe('getSiteUrl', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should return VERCEL_URL when available', () => {
        process.env.VERCEL_URL = 'example-vercel.app';
        expect(getSiteUrl()).toBe('https://example-vercel.app');
    });

    it('should return SITE_URL when VERCEL_URL is not available', () => {
        process.env.SITE_URL = 'https://custom-site.com';
        expect(getSiteUrl()).toBe('https://custom-site.com');
    });

    it('should return NEXT_PUBLIC_VERCEL_URL when other URLs are not available', () => {
        process.env.NEXT_PUBLIC_VERCEL_URL = 'public-vercel.app';
        expect(getSiteUrl()).toBe('https://public-vercel.app');
    });

    it('should return localhost with default port when no environment variables are set', () => {
        expect(getSiteUrl()).toBe('http://127.0.0.1:3000');
    });

    it('should return localhost with custom port when PORT is set', () => {
        process.env.PORT = '4000';
        expect(getSiteUrl()).toBe('http://127.0.0.1:4000');
    });
});

describe('disabaledDates', () => {
    it('should disable dates outside the default range', () => {
        // Create a date before FIRST_DAY
        const beforeFirstDay = new Date(FIRST_DAY);
        beforeFirstDay.setDate(beforeFirstDay.getDate() - 1);

        // Create a date after today
        const afterToday = new Date();
        afterToday.setDate(afterToday.getDate() + 1);

        // Create a date within the valid range
        const validDate = new Date();

        // Test the function
        expect(disabaledDates(beforeFirstDay)).toBe(true);
        expect(disabaledDates(afterToday)).toBe(true);
        expect(disabaledDates(validDate)).toBe(false);
    });

    it('should respect custom date ranges', () => {
        // Create custom date range
        const startDate = new Date('2023-01-01');
        const endDate = new Date('2023-12-31');

        // Create test dates
        const beforeRange = new Date('2022-12-31');
        const withinRange = new Date('2023-06-15');
        const afterRange = new Date('2024-01-01');

        // Test with custom options
        const options = {
            dateRange: [startDate, endDate] as const
        };

        expect(disabaledDates(beforeRange, options)).toBe(true);
        expect(disabaledDates(withinRange, options)).toBe(false);
        expect(disabaledDates(afterRange, options)).toBe(true);
    });
});
