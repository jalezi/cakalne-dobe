'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import {
  ComboBoxResponsive,
  type SelectOption,
} from '@/components/combo-box-responsive';
import theme from '@/theme';
import { Label } from '@/components/ui/label';
import { ClassicLoader } from '@/components/ui/loaders';
import type { BrushChartData } from './brush-chart';
import { getProcedureWtForInstOnDay } from '@/actions/get-procedure-wt-for-inst-on-day';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Time } from '@/components/time';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, disabaledDates } from '@/lib/utils';
import { sl } from 'date-fns/locale';

// Override console.error
// This is a hack to suppress the warning about missing defaultProps in recharts library as of version 2.12
// @link https://github.com/recharts/recharts/issues/3615
const error = console.error;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
console.error = (...args: any) => {
  if (!Array.isArray(args) || !args[0] || typeof args[0] !== 'string') return;
  if (/defaultProps/.test(args[0])) return;
  error(...args);
};

const BrushChart = dynamic(
  () => import('./brush-chart').then((mod) => mod.BrushChart),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-[480px] place-items-center">
        <ClassicLoader />
      </div>
    ),
  }
);

interface ChartProps<TLines extends string[]> {
  lineDatakeys: TLines;
  initialData: BrushChartData<TLines>[];
  initialDate: Date;
  procedureOptions: SelectOption[];
  initialProcedure: string;
}

export function ProcedureWtByInstOnDayChart<TLines extends string[]>({
  lineDatakeys,
  initialData,
  initialDate,
  procedureOptions,
  initialProcedure,
}: ChartProps<TLines>) {
  const [chartData, setChartData] =
    useState<BrushChartData<TLines>[]>(initialData);

  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [procedure, setProcedure] = useState<string>(initialProcedure);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    return;
  };

  const onProcedureSelect = async (value: string) => {
    const newChartData = (await getProcedureWtForInstOnDay(
      value,
      date ?? initialDate
    )) as BrushChartData<TLines>[];
    setChartData(newChartData);
    setProcedure(value);
  };

  const onDateChange = async (date: Date | undefined) => {
    if (!date) return;
    const newChartData = (await getProcedureWtForInstOnDay(
      procedure,
      date
    )) as BrushChartData<TLines>[];
    setChartData(newChartData);
    setDate(date);
  };

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-2">
        <div className="space-x-1 space-y-2">
          <Label id="procedure-code-label" htmlFor="procedureCode">
            Postopek
          </Label>
          <ComboBoxResponsive
            id="chart-procedure-code"
            options={procedureOptions}
            onSelect={onProcedureSelect}
            defaultSelected={procedureOptions[0]}
            excludeOptionAll
          />
        </div>
        <div className="space-x-1 space-y-2">
          <Label htmlFor="date">Datum</Label>
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
                {date ? <Time date={date} /> : <span>Izberi datum</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="flex w-auto flex-col space-y-2 p-2">
              <Button
                variant="outline"
                onClick={() => onDateChange(new Date())}
              >
                Danes
              </Button>
              <Calendar
                id="date"
                mode="single"
                selected={date}
                onSelect={onDateChange}
                disabled={(day) => disabaledDates(day)}
                locale={sl}
                defaultMonth={date ?? new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>
      </form>
      <figure className="relative mt-2 min-h-[480px]">
        <BrushChart
          lineDataKeys={lineDatakeys}
          lineStrokes={[
            theme.colors['chart-line-1'].DEFAULT,
            theme.colors['chart-line-2'].DEFAULT,
            theme.colors['chart-line-3'].DEFAULT,
          ]}
          chartData={chartData}
          lineFriendlyNames={{
            regular: 'Običajno',
            fast: 'Hitro',
            veryFast: 'Zelo hitro',
          }}
        />
        <figcaption
          id="attr-chart-caption"
          aria-labelledby="attr-chart-caption procedure-code-label chart-procedure-code"
          className="sr-only"
        >
          Graf prikazuje povprečne čakalne dobe za izbrani postopek.
        </figcaption>
      </figure>
    </>
  );
}
