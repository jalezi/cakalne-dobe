'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { sl } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Time } from './time';

type SelectOption = {
  value: string;
  label: string;
};

type DataPickerDemoProps = {
  jobsOptions: SelectOption[];
};

export function DatePickerDemo({ jobsOptions }: DataPickerDemoProps) {
  const params = useParams<{ day: string }>();
  const urlSearchParams = useSearchParams();
  const router = useRouter();

  const selectedOption = jobsOptions?.find((option) =>
    option.label.includes(params.day)
  );
  const [date, setDate] = React.useState<Date | undefined>(
    selectedOption?.label ? new Date(selectedOption?.label) : undefined
  );
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  const onSelect = (day: Date | undefined) => {
    if (!day) {
      return;
    }

    const dayString = format(day, 'yyyy-MM-dd');
    const searchParams =
      urlSearchParams.size > 0 ? `?${urlSearchParams.toString()}` : '';
    setDate(day);
    setCalendarOpen(false);
    router.replace(`/${dayString}/${searchParams}`);
  };

  React.useEffect(() => {
    setDate(params.day ? new Date(params.day) : undefined);
  }, [params.day]);

  return (
    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-[280px] justify-start text-left font-normal',
            !date && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? <Time date={date} /> : <span>Izberi dan</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          initialFocus
          locale={sl}
          lang="sl"
          fromDate={new Date(jobsOptions[jobsOptions.length - 1].label)}
          toDate={new Date(jobsOptions[0].label)}
        />
      </PopoverContent>
    </Popover>
  );
}
