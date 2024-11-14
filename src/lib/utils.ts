import { type ClassValue, clsx } from 'clsx';
import { format } from 'date-fns';
import { twMerge } from 'tailwind-merge';
import { FIRST_DAY } from './constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getSiteUrl = () => {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.SITE_URL) return process.env.SITE_URL;
  if (process.env.NEXT_PUBLIC_VERCEL_URL)
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  return `http://127.0.0.1:${process.env.PORT ?? 3000}`;
};

const DEFAULT_OPTIONS = {
  dateRange: [FIRST_DAY, new Date()] as const,
} as const;

type DisabledDatesOptions = typeof DEFAULT_OPTIONS;

export const disabaledDates = (
  day: Date,
  options: DisabledDatesOptions = DEFAULT_OPTIONS
) => {
  const { dateRange } = options;
  return (
    format(day, 'yyyy-MM-dd') > format(dateRange[1], 'yyyy-MM-dd') ||
    format(day, 'yyyy-MM-dd') < format(dateRange[0], 'yyyy-MM-dd')
  );
};
