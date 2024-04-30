'use client';

import * as React from 'react';
import { addDays, isAfter, isBefore, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { type DateRange } from 'react-day-picker';
import { sl } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import Link from 'next/link';
import { Time, TimeRange } from './time';
import { Label } from './ui/label';

// day @mitar has started to collect data for the first time
const FIRST_DAY = new Date(2024, 3, 7);

interface DateRangeJobLinksProps {
  initialDateRange?: {
    to: Date;
    from: Date;
  };
  links: { value: string; label: string }[];
}

export function DateRangeJobLinks({
  initialDateRange,
  links,
}: DateRangeJobLinksProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(
    initialDateRange ?? {
      to: new Date(),
      from: addDays(new Date(), -6),
    }
  );

  const dateFromString = date?.from?.toString();
  const dateToString = date?.to?.toString();

  const filteredLinks = React.useMemo(() => {
    return links.filter((link) => {
      const linkDate = new Date(link.label);
      if (!dateFromString || !dateToString) return false;

      const dateFrom = new Date(dateFromString);
      const dateTo = new Date(dateToString);
      if (isSameDay(linkDate, dateFrom) || isSameDay(linkDate, dateTo)) {
        return true;
      }

      const isGreaterOrEqual = isAfter(linkDate, dateFrom);
      const isLessOrEqual = isBefore(linkDate, dateTo);

      return isGreaterOrEqual && isLessOrEqual;
    });
  }, [dateFromString, dateToString, links]);

  return (
    <>
      <div className="flex flex-col gap-2">
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
                  case '0':
                    setDate({
                      from: new Date(
                        new Date().setDate(
                          today.getDate() - (today.getDay() || 7) + 1
                        )
                      ),
                      to: today,
                    });

                    break;
                  case '1':
                    setDate({
                      from: addDays(today, -6),
                      to: today,
                    });
                    break;
                }
              }}
            >
              <SelectTrigger id="date-range">
                <SelectValue placeholder="Izberi časovno obdobje" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="0">Ta teden</SelectItem>
                <SelectItem value="1">Zadnjih 7 dni</SelectItem>
              </SelectContent>
            </Select>
            <div className="rounded-md border">
              <Calendar
                initialFocus
                mode="range"
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
                disabled={(day) =>
                  day > new Date() || day < new Date(2024, 3, 7)
                }
                locale={sl}
                fromDate={FIRST_DAY}
                toDate={new Date()}
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <nav className="px-4 py-2">
        <ul>
          {filteredLinks.map((job) => (
            <li key={job.value}>
              <Button asChild variant="link" className="px-0">
                <Link href={`/${job.value}`}>
                  <Time
                    date={job.label}
                    options={{
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric',
                      second: 'numeric',
                      timeZone: 'Europe/Ljubljana',
                    }}
                  />
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
