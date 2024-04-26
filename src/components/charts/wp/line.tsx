'use client';

import { Time } from '@/components/time';
import { cn } from '@/lib/utils';

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

type Payload = {
  value: string | number;
  name: string;
  color: string;
  stroke: string;
  payload: { date: Date };
  fill: string;
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Payload[];
  label?: number;
}

const CustomContent = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length > 0) {
    const { payload: pldBase } = payload[0];

    return (
      <div className="bg-background p-2 text-foreground">
        <Time date={pldBase?.date} className="text-xs font-semibold" />
        <ul>
          {payload.map((pld: Payload, index) => {
            document.body.style.setProperty(
              `--tooltip-color-${index}`,
              pld.color
            );
            return (
              <li
                key={pld.name}
                className={cn(
                  `text-xs`,
                  `text-[var(--tooltip-color-${index})]`
                )}
              >
                {`${pld.name} : ${pld.value}`}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
  return null;
};

type PageData = {
  date: Date;
  regular: number;
  fast: number;
  veryFast: number;
};

interface MyLineChartProps<TLines extends string[]> {
  lineDataKeys: TLines;
  lineStrokes: `#${string}`[];
  chartData: PageData[];
  lineFriendlyNames?: Record<TLines[number], string>;
}

export function MyLineChart<TLine extends string[]>({
  chartData: pageData,
  lineDataKeys,
  lineStrokes,
  lineFriendlyNames,
}: MyLineChartProps<TLine>) {
  const [activeSeries, setActiveSeries] = useState<Array<string>>([]);

  const handleLegendClick = (dataKey: string) => {
    if (activeSeries.includes(dataKey)) {
      setActiveSeries(activeSeries.filter((el) => el !== dataKey));
    } else {
      setActiveSeries((prev) => [...prev, dataKey]);
    }
  };

  const dateFormater = (value: string, _payload: unknown) => {
    return Intl.DateTimeFormat('sl-SI', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value));
  };

  const dateNumericValues = pageData.map((el) => el.date.getTime());

  return (
    <ResponsiveContainer
      height={600}
      width="100%"

      // initialDimension={{ width: 1000, height: 400 }}
    >
      <LineChart
        data={pageData}
        title="Some title"
        accessibilityLayer
        margin={{ bottom: 48, top: 24, left: 0, right: 0 }}
      >
        <XAxis
          dataKey="date"
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
          interval={2}
          className="text-xs"
        />
        <YAxis className="text-xs" />
        <CartesianGrid strokeDasharray="3 3" />
        <Tooltip labelFormatter={dateFormater} content={<CustomContent />} />
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
            hide={activeSeries.includes(line)}
            type="monotone"
            dataKey={line}
            stroke={lineStrokes[index]}
            fill="#8884d8"
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
