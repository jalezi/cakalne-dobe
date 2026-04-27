import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getSiteUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.SITE_URL) {
    return process.env.SITE_URL;
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  const port = process.env.PORT ?? '3000';
  return `http://127.0.0.1:${port}`;
}

// April 7, 2024 - the first day data collection started
const DEFAULT_FIRST_DAY = new Date(Date.UTC(2024, 3, 7));

export function disabaledDates(
  date: Date,
  options?: { dateRange: readonly [Date, Date] }
): boolean {
  const [start, end] = options?.dateRange ?? [DEFAULT_FIRST_DAY, new Date()];
  return date < start || date > end;
}
