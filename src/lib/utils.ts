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

export const disabaledDates = (day: Date) => {
  return (
    format(day, 'yyyy-MM-dd') > format(new Date(), 'yyyy-MM-dd') ||
    format(day, 'yyyy-MM-dd') < format(FIRST_DAY, 'yyyy-MM-dd')
  );
};
