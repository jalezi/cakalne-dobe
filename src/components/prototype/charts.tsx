'use client';
// PROTOTYPE (throwaway). Chart pieces, loaded lazily via next/dynamic so the
// recharts bundle is only fetched when a chart is on screen.

import {
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

// Horizontal bars per institution with the legal-max reference line (B).
export function InstitutionBars({
  data,
  max,
}: {
  data: { name: string; days: number }[];
  max: number;
}) {
  const config = {
    days: { label: 'Dni', color: 'var(--chart-line-2)' },
  } satisfies ChartConfig;
  return (
    <ChartContainer
      config={config}
      className="aspect-auto w-full"
      style={{ height: Math.max(120, data.length * 24 + 40) }}
    >
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" />
        <YAxis
          type="category"
          dataKey="name"
          width={280}
          tick={{ fontSize: 11 }}
          interval={0}
          tickFormatter={(n: string) =>
            n.length > 30 ? `${n.slice(0, 29)}…` : n
          }
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ReferenceLine
          x={max}
          stroke="var(--destructive)"
          strokeDasharray="4 4"
          label={{ value: `meja ${max} d`, position: 'top', fontSize: 11 }}
        />
        <Bar dataKey="days" fill="var(--color-days)" radius={3} />
      </BarChart>
    </ChartContainer>
  );
}

// Tiny line per institution (C).
export function Sparkline({
  data,
  max,
}: {
  data: { d: string; v: number | null }[];
  max: number;
}) {
  const config = { v: { label: 'Dni', color: 'var(--foreground)' } };
  return (
    <ChartContainer config={config} className="aspect-auto h-8 w-56">
      <LineChart data={data} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
        <YAxis hide domain={[0, (dataMax: number) => Math.max(dataMax, max)]} />
        <ReferenceLine
          y={max}
          stroke="var(--destructive)"
          strokeDasharray="3 3"
        />
        <Line
          dataKey="v"
          stroke="var(--color-v)"
          dot={false}
          strokeWidth={1.25}
          isAnimationActive={false}
          connectNulls
        />
      </LineChart>
    </ChartContainer>
  );
}

// Weekday comparison, last 4 weeks grouped by weekday (C, issue #1).
export function WeekdayBars({
  data,
}: {
  data: {
    day: string;
    w1: number | null;
    w2: number | null;
    w3: number | null;
    w4: number | null;
  }[];
}) {
  const config = {
    w1: { label: 'pred 3 tedni', color: 'var(--chart-1)' },
    w2: { label: 'pred 2 tednoma', color: 'var(--chart-2)' },
    w3: { label: 'prejšnji teden', color: 'var(--chart-3)' },
    w4: { label: 'ta teden', color: 'var(--chart-line-2)' },
  } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} />
        <YAxis width={36} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {(['w1', 'w2', 'w3', 'w4'] as const).map((k) => (
          <Bar key={k} dataKey={k} fill={`var(--color-${k})`} radius={2} />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

// Timeline: average + selected institutions + legal max, with a brush (D).
export function Timeline({
  data,
  lines,
  max,
}: {
  data: Record<string, string | number | null>[];
  lines: { key: string; label: string }[];
  max: number;
}) {
  const palette = [
    'var(--chart-line-1)',
    'var(--chart-line-3)',
    'var(--chart-2)',
    'var(--chart-4)',
    'var(--chart-1)',
  ];
  const config: ChartConfig = {
    avg: { label: 'Povprečje vseh ustanov', color: 'var(--chart-line-2)' },
  };
  lines.forEach((l, k) => {
    config[l.key] = { label: l.label, color: palette[k % palette.length] };
  });
  return (
    <ChartContainer config={config} className="aspect-auto h-96 w-full">
      <LineChart data={data} margin={{ left: 4, right: 16 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="d" minTickGap={40} tickLine={false} />
        <YAxis width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <ReferenceLine
          y={max}
          stroke="var(--destructive)"
          strokeDasharray="4 4"
          label={{
            value: `meja ${max} d`,
            position: 'insideTopLeft',
            fontSize: 11,
          }}
        />
        <Line
          dataKey="avg"
          stroke="var(--color-avg)"
          strokeWidth={2.5}
          dot={false}
          connectNulls
        />
        {lines.map((l) => (
          <Line
            key={l.key}
            dataKey={l.key}
            stroke={`var(--color-${l.key})`}
            strokeWidth={1.5}
            dot={false}
          />
        ))}
        <Brush dataKey="d" height={24} travellerWidth={8} />
      </LineChart>
    </ChartContainer>
  );
}
