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

const TimeSeriesChart = dynamic(
  () => import('./time-series-chart').then((mod) => mod.TimeSeriesChart),
  { ssr: false }
);

interface ChartProps<TLines extends string[]> {
  lineDatakeys: TLines;
  initialData: TimeSeriesChartData<TLines>[];
  procedureOptions: SelectOption[];
}

export function Chart<TLines extends string[]>({
  lineDatakeys,
  initialData,
  procedureOptions,
}: ChartProps<TLines>) {
  const [chartData, setChartData] =
    useState<TimeSeriesChartData<TLines>[]>(initialData);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    return;
  };

  const onSelect = async (value: string) => {
    const newChartData = (await getProcedureAvgWtPerJobChart(
      value
    )) as TimeSeriesChartData<TLines>[];
    setChartData(newChartData);
  };

  return (
    <>
      <form onSubmit={onSubmit} className="w-full ">
        <div className="flex flex-wrap gap-2">
          <label id="procedure-code-label" htmlFor="procedureCode">
            Postopek
          </label>
          <ComboBoxResponsive
            id="procedure-code-combo"
            options={procedureOptions}
            onSelect={onSelect}
            defaultSelected={procedureOptions[0]}
            excludeOptionAll
          />
        </div>
      </form>
      <figure className="min-h-[480px]">
        <figcaption
          aria-labelledby="procedure-code-label procedure-code-select"
          className="sr-only"
        />
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
      </figure>
    </>
  );
}
