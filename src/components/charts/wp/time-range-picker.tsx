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
import { cn, disabaledDates } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { Time, TimeRange } from '@/components/time';
import { FIRST_DAY } from '@/lib/constants';

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
                case '3': {
                  const fromDate = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    1
                  );
                  const toDate = new Date();
                  setDate({
                    from: fromDate,
                    to: toDate,
                  });
                  onChange?.({
                    from: fromDate,
                    to: toDate,
                  });
                  break;
                }
                case '4': {
                  const fromDate = new Date(
                    today.getFullYear(),
                    today.getMonth() - 1,
                    1
                  );
                  const toDate = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    0
                  );
                  setDate({
                    from: fromDate,
                    to: toDate,
                  });
                  onChange?.({
                    from: fromDate,
                    to: toDate,
                  });
                  break;
                }
                case '5': {
                  const fromDate = addDays(today, -29);
                  const toDate = new Date();
                  setDate({
                    from: fromDate,
                    to: toDate,
                  });
                  onChange?.({
                    from: fromDate,
                    to: toDate,
                  });
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
              <SelectItem value="3">Ta mesec</SelectItem>
              <SelectItem value="4">Prejšnji mesec</SelectItem>
              <SelectItem value="5">Zadnjih 30 dni</SelectItem>
            </SelectContent>
          </Select>
          <div className="rounded-md border">
            <Calendar
              initialFocus
              mode="range"
              selected={date}
              onSelect={onSelected}
              numberOfMonths={2}
              disabled={(day) => disabaledDates(day)}
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
