'use client';

import { useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TooltipContent } from './tooltip-content';

type HexColor = `#${string}`;

export type TimeSeriesChartData<TLines extends string[]> = {
  x: Date | string | number;
  y: {
    [key in TLines[number]]: unknown;
  };
};

interface TimeSeriesChartProps<TLines extends string[]> {
  lineDataKeys: TLines;
  lineStrokes: HexColor[];
  chartData: TimeSeriesChartData<TLines>[];
  lineFriendlyNames?: Record<TLines[number], string>;
}

export function TimeSeriesChart<TLine extends string[]>({
  chartData,
  lineDataKeys,
  lineStrokes,
  lineFriendlyNames,
}: TimeSeriesChartProps<TLine>) {
  const [activeSeries, setActiveSeries] = useState<Array<string>>([]);

  const allValues = chartData.flatMap(
    (data) =>
      lineDataKeys
        .map((line) => {
          if (!activeSeries.includes(line)) {
            return data.y[line as keyof typeof data.y];
          } else {
            return null;
          }
        })
        .filter((el) => el !== null) as number[]
  );

  const handleLegendClick = (dataKey: string) => {
    if (activeSeries.includes(dataKey)) {
      setActiveSeries(activeSeries.filter((el) => el !== dataKey));
    } else {
      setActiveSeries((prev) => [...prev, dataKey]);
    }
  };

  const dateFormater = (value: string, _payload: unknown) => {
    return Intl.DateTimeFormat('sl-SI', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(value));
  };

  const chartDataWithDate = chartData.map((el) => ({
    ...el,
    x: el.x instanceof Date ? el.x : new Date(el.x),
  }));

  const dateNumericValues = chartDataWithDate.map((el) => el.x.getTime());
  const yDomain = [
    Math.floor(Math.min(...allValues)),
    Math.ceil(Math.max(...allValues)),
  ];

  return (
    <ResponsiveContainer
      height={480}
      width="100%"

      // initialDimension={{ width: 1000, height: 400 }}
    >
      <LineChart
        data={chartDataWithDate}
        accessibilityLayer
        margin={{ bottom: 48, top: 24, left: 0, right: 4 }}
      >
        <XAxis
          dataKey="x"
          label={{
            position: 'insideBottom',
            value: 'datum',
            offset: -20,
          }}
          domain={[
            Math.min(...dateNumericValues),
            Math.max(...dateNumericValues),
          ]}
          scale="time"
          type="number"
          tickFormatter={dateFormater}
          interval={'preserveEnd'}
          className="text-xs"
        />
        <YAxis
          className="text-xs"
          domain={yDomain}
          label={{
            value: 'čas [dni]',
            angle: -90,
            position: 'insideLeft',
            offset: 8,
          }}
        />
        <CartesianGrid strokeDasharray="3 3" />
        <Tooltip labelFormatter={dateFormater} content={<TooltipContent />} />
        <Legend
          height={36}
          iconSize={8}
          iconType="circle"
          onClick={(props) => handleLegendClick(props.dataKey as string)}
          wrapperStyle={{ bottom: -6, right: 12, fontSize: '0.75rem' }}
          className="text-xs"
          verticalAlign="bottom"
          align="center"
        />
        {lineDataKeys.map((line, index) => (
          <Line
            key={line}
            hide={activeSeries.includes(`y.${line}`)}
            type="monotone"
            dataKey={`y.${line}`}
            stroke={lineStrokes[index]}
            fill={lineStrokes[index]}
            name={
              lineFriendlyNames?.[line as keyof typeof lineFriendlyNames] ??
              line
            }
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
