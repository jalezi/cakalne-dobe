'use client';

import {
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TooltipContent } from './tooltip-content';
import { useState } from 'react';



type HexColor = `#${string}`;
type HSL = string;

export type BrushChartData<TLines extends string[]> = {
  x: string;
  y: {
    [key in TLines[number]]: unknown;
  };
};

interface BruchCharProps<TLines extends string[]> {
  lineDataKeys: TLines;
  lineStrokes: (HexColor | HSL)[];
  chartData: BrushChartData<TLines>[];
  lineFriendlyNames?: Record<TLines[number], string>;
}

export function BrushChart<TLine extends string[]>({
  chartData,
  lineDataKeys,
  lineStrokes,
  lineFriendlyNames,
}: BruchCharProps<TLine>) {
  const [activeSeries, setActiveSeries] = useState<Array<string>>([]);

  const handleLegendClick = (dataKey: string) => {
    if (activeSeries.includes(dataKey)) {
      setActiveSeries(activeSeries.filter((el) => el !== dataKey));
    } else {
      setActiveSeries((prev) => [...prev, dataKey]);
    }
  };



  return (
    <ResponsiveContainer height={480} width="100%">
      <BarChart
        data={chartData}
        accessibilityLayer
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="x"
          interval="preserveStartEnd"
          type="category"
          className="text-sm"
        />
        <YAxis
          className="text-xs"
          label={{
            value: 'čas [dni]',
            angle: -90,
            position: 'insideLeft',
            offset: 8,
          }}
        />
        <Tooltip content={<TooltipContent lineStrokes={lineStrokes} />} />
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
        <ReferenceLine y={0} stroke="#000" />
        <Brush
          dataKey="x"
          height={30}
          stroke={"var(--muted-foreground)"}
          className="text-sm"
          endIndex={chartData.length - 1 >= 10 ? 10 : chartData.length - 1}
        />
        {lineDataKeys.map((line, index) => (
          <Bar
            key={line}
            hide={activeSeries.includes(`y.${line}`)}
            dataKey={`y.${line}`}
            stroke={lineStrokes[index]}
            fill={lineStrokes[index]}
            name={
              lineFriendlyNames?.[line as keyof typeof lineFriendlyNames] ??
              line
            }
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
