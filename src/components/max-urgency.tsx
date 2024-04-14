import { cn } from '@/lib/utils';

const slOrdinalRules = new Intl.PluralRules('sl-SI', { type: 'ordinal' });

const daySuffix = new Map([
  ['zero', 'dni'],
  ['one', 'dan'],
  ['two', 'dneva'],
  ['few', 'dni'],
  ['many', 'dni'],
  ['other', 'dni'],
]);

const formatOrdinals = (value: number) => {
  const rule = slOrdinalRules.select(value);
  const suffix = daySuffix.get(rule) ?? '';
  return `${value} ${suffix}`;
};

interface MaxUrgencyProps extends React.HTMLAttributes<HTMLSpanElement> {
  days: number;
}

export const MaxUrgency = ({ days, className, ...props }: MaxUrgencyProps) => {
  return (
    <span className={cn('text-xs text-gray-500', className)} {...props}>
      <abbr title="maksimum">maks.</abbr>: {formatOrdinals(days)}
    </span>
  );
};
