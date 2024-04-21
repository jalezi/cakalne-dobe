import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

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
    <>
      <span id="attr-max-days" className="sr-only" {...props}>
        <abbr className="sr-only" title="maksimum">
          maks.
        </abbr>
        : {formatOrdinals(days)}
      </span>
      <Badge
        className={cn('my-1', className)}
        variant="destructive"
        aria-labelledby="attr-max-days"
      >
        {days}
      </Badge>
    </>
  );
};
