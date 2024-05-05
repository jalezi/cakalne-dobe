'use client';

import dynamic from 'next/dynamic';
import type { TimeSeriesChartData } from './time-series-chart';
import { useState } from 'react';
import { getProcedureAvgWtPerJobChart } from '@/actions/get-procedure-avg-wt-per-job-chart';
import {
  ComboBoxResponsive,
  type SelectOption,
} from '@/components/combo-box-responsive';
import theme from '@/theme';
import { TimeRangePicker } from './time-range-picker';
import { Label } from '@/components/ui/label';
import type { DateRange } from 'react-day-picker';
import { ClassicLoader } from '@/components/ui/loaders';

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

const TimeSeriesChart = dynamic(
  () => import('./time-series-chart').then((mod) => mod.TimeSeriesChart),
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
  initialData: TimeSeriesChartData<TLines>[];
  initialDateRange: {
    to: Date;
    from: Date;
  };
  procedureOptions: SelectOption[];
}

export function AverageWaitingTimeChart<TLines extends string[]>({
  lineDatakeys,
  initialData,
  initialDateRange,
  procedureOptions,
}: ChartProps<TLines>) {
  const [chartData, setChartData] =
    useState<TimeSeriesChartData<TLines>[]>(initialData);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    return;
  };

  const onProcedureSelect = async (value: string) => {
    const newChartData = (await getProcedureAvgWtPerJobChart(
      value,
      initialDateRange.to,
      initialDateRange.from
    )) as TimeSeriesChartData<TLines>[];
    setChartData(newChartData);
  };

  const onDateRangeChange = async (dateRange: DateRange) => {
    if (!dateRange || !dateRange.from) return;
    const newChartData = (await getProcedureAvgWtPerJobChart(
      procedureOptions[0].value,
      dateRange.to ?? dateRange.from,
      dateRange.from ?? initialDateRange.from
    )) as TimeSeriesChartData<TLines>[];
    setChartData(newChartData);
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
          <TimeRangePicker
            initialDateRange={initialDateRange}
            onChange={onDateRangeChange}
          />
        </div>
      </form>
      <figure className="relative min-h-[480px]">
        <TimeSeriesChart
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
