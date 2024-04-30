'use client';

import React, { useState } from 'react';

import { addDays } from 'date-fns';
import type {
  ActiveModifiers,
  DateRange,
  SelectRangeEventHandler,
} from 'react-day-picker';
import { sl } from 'date-fns/locale';

import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { Time, TimeRange } from '@/components/time';

// day @mitar has started to collect data for the first time
const FIRST_DAY = new Date(2024, 3, 7);

interface TimeRangePickerProps {
  initialDateRange?: {
    to: Date;
    from: Date;
  };
  onChange?: (dateRange: DateRange) => void;
}

export function TimeRangePicker({
  initialDateRange,
  onChange,
}: TimeRangePickerProps) {
  const defaultDateRange = {
    to: new Date(),
    from: addDays(new Date(), -6),
  };
  const [date, setDate] = useState<DateRange | undefined>(
    initialDateRange ?? defaultDateRange
  );

  const onSelected: SelectRangeEventHandler = (
    range: DateRange | undefined,
    _selectedDay: Date,
    _activeModifiers: ActiveModifiers,
    _e: React.MouseEvent
  ) => {
    setDate(range);
    if (!range) {
      return;
    }
    onChange?.(range);
  };

  return (
    <>
      <Label htmlFor="date-range">Časovno obdobje</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={'outline'}
            className={cn(
              'max-w-[17rem] justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <TimeRange
                  startDate={date.from}
                  endDate={date.to}
                  locale="sl"
                />
              ) : (
                <Time date={date.from} />
              )
            ) : (
              <span>Izberi časovno obdobje</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="flex w-auto flex-col space-y-2 p-2">
          <Select
            onValueChange={(value) => {
              const today = new Date();
              switch (value) {
                case '0': {
                  setDate(initialDateRange);
                  onChange?.(initialDateRange ?? defaultDateRange);
                  break;
                }

                case '1': {
                  const fromDate = new Date(
                    new Date().setDate(
                      today.getDate() - (today.getDay() || 7) + 1
                    )
                  );
                  setDate({
                    from: fromDate,
                    to: today,
                  });
                  onChange?.({
                    from: fromDate,
                    to: today,
                  });

                  break;
                }
                case '2': {
                  const fromDate = addDays(today, -6);
                  setDate({
                    from: fromDate,
                    to: today,
                  });
                  onChange?.({
                    from: fromDate,
                    to: today,
                  });
                  break;
                }
              }
            }}
          >
            <SelectTrigger id="date-range">
              <SelectValue placeholder="Izberi časovno obdobje" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="0">Ponastavi</SelectItem>
              <SelectItem value="1">Ta teden</SelectItem>
              <SelectItem value="2">Zadnjih 7 dni</SelectItem>
            </SelectContent>
          </Select>
          <div className="rounded-md border">
            <Calendar
              initialFocus
              mode="range"
              selected={date}
              onSelect={onSelected}
              numberOfMonths={2}
              disabled={(day) => day > new Date() || day < FIRST_DAY}
              locale={sl}
              fromDate={FIRST_DAY}
              toDate={new Date()}
            />
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
