import { type TimeHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export const INTL_LOCALES = {
  sl: 'sl-SI',
} as const;

export const DEFAULT_LOCALE = INTL_LOCALES.sl;

const INTL_OPTIONS_MONTH_SHORT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

export const isIntlLocale = (
  locale: string
): locale is keyof typeof INTL_LOCALES => {
  return locale in INTL_LOCALES;
};

/**
 * Retrieves the corresponding Intl locale based on the provided locale string.
 * If the provided locale is not valid or not available, it falls back to the default locale.
 *
 * @param locale - The locale string.
 * @returns The corresponding Intl locale.
 */
export const getIntlLocale = (locale?: string) => {
  if (!locale || !isIntlLocale(locale)) {
    return DEFAULT_LOCALE;
  }

  return INTL_LOCALES[locale];
};

export function createDateFormat(
  locale: string = INTL_LOCALES.sl,
  options: Intl.DateTimeFormatOptions = INTL_OPTIONS_MONTH_SHORT,
  noDefault?: boolean
) {
  const hasStyleShortCuts = options.dateStyle || options.timeStyle;
  const defaultOptions = noDefault ? {} : INTL_OPTIONS_MONTH_SHORT;
  const mergedOptions = hasStyleShortCuts
    ? options
    : { ...defaultOptions, ...options };

  return (date: Date) => {
    return Intl.DateTimeFormat(locale, mergedOptions).format(date);
  };
}

export function createDateFormatRange(
  locale: string = INTL_LOCALES.sl,
  options: Intl.DateTimeFormatOptions = INTL_OPTIONS_MONTH_SHORT
) {
  const hasStyleShortCuts = options.dateStyle || options.timeStyle;
  const mergedOptions = hasStyleShortCuts
    ? options
    : { ...INTL_OPTIONS_MONTH_SHORT, ...options };

  return (start: Date, end: Date) => {
    return Intl.DateTimeFormat(locale, mergedOptions).formatRange(start, end);
  };
}

type LocaleOptions = Pick<
  Intl.DateTimeFormatOptions,
  | 'localeMatcher'
  | 'hour12'
  | 'calendar'
  | 'timeZone'
  | 'hourCycle'
  | 'numberingSystem'
>;

type DateTimeComponentOptions = Pick<
  Intl.DateTimeFormatOptions,
  | 'weekday'
  | 'era'
  | 'year'
  | 'month'
  | 'day'
  | 'dayPeriod'
  | 'hour'
  | 'minute'
  | 'second'
  | 'fractionalSecondDigits'
  | 'timeZone'
  | 'timeZoneName'
  | 'formatMatcher'
>;

type StyleShortcutsOptions =
  | Pick<Intl.DateTimeFormatOptions, 'dateStyle' | 'timeStyle'>
  | LocaleOptions;

type Options =
  | {
      shortcuts?: false;
      options?: LocaleOptions & DateTimeComponentOptions;
    }
  | {
      shortcuts: true;
      options?: LocaleOptions & StyleShortcutsOptions;
    };

export type TimeProps = TimeHTMLAttributes<HTMLElement> & {
  date: Date | string | number;
  locale?: string;
  noDefault?: boolean;
} & Options;

/**
 * Renders a formatted date and time.
 *
 * @param {TimeProps} props - The component props.
 * @param {Date | string | number} props.date - The date to be formatted.
 * @param {string} [props.locale] - The locale to be used for formatting. Defaults to the default locale.
 * @param {boolean} [props.noDefault] - Whether to use the default formatting options. If provided, the `shortcuts` and `options` props will be ignored.
 * @param {Options["shortcuts"]} [props.shortCuts] - Whether to use the short cut options for formatting. If provided, the `dateStyle` and `timeStyle` options will be ignored.
 * @param {Options["options"]} [props.options] - The formatting options to be used. If provided, the `dateStyle` and `timeStyle` options will be ignored.
 * @param {React.HTMLAttributes<HTMLElement>} [props.props] - Additional HTML attributes for the component.
 * @returns {JSX.Element} The rendered time component.
 */
export function Time({
  date,
  locale = DEFAULT_LOCALE,
  noDefault,
  shortcuts: _shortCuts,
  options,
  className,
  ...props
}: TimeProps): JSX.Element {
  const formatDate = createDateFormat(locale, options, noDefault);
  const dateToFormat = date instanceof Date ? date : new Date(date);
  const formattedDateString = formatDate(dateToFormat);

  return (
    <time
      className={cn('text-center', className)}
      dateTime={dateToFormat.toUTCString()}
      {...props}
    >
      {formattedDateString}
    </time>
  );
}

export interface TimeRangeProps extends TimeHTMLAttributes<HTMLElement> {
  startDate: Date | string | number;
  endDate: Date | string | number;
  locale?: string;
}

/**
 * Renders a time range component.
 *
 * @param {TimeRangeProps} props - The component props.
 * @param {Date | string | number} props.startDate - The start date of the time range.
 * @param {Date | string | number} props.endDate - The end date of the time range.
 * @param {string} props.locale - The locale to use for formatting the dates. Defaults to the default locale.
 * @returns The rendered time range component.
 */
export function TimeRange({
  startDate,
  endDate,
  locale = DEFAULT_LOCALE,
  className,
  ...props
}: TimeRangeProps): JSX.Element {
  const formatDateRange = createDateFormatRange(locale);
  const startDateToFormat =
    startDate instanceof Date ? startDate : new Date(startDate);
  const endDateToFormat = endDate instanceof Date ? endDate : new Date(endDate);
  const formattedRange = formatDateRange(startDateToFormat, endDateToFormat);

  return (
    <time
      className={cn('text-center', className)}
      dateTime={`${startDateToFormat.toISOString().split('T')[0]}/${endDateToFormat.toISOString().split('T')[0]}`}
      {...props}
    >
      {formattedRange}
    </time>
  );
}
