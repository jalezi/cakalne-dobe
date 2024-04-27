'use server';

import dynamic from 'next/dynamic';

import { getProcedureAvgWtPerJobChart } from '@/actions/get-procedure-avg-wt-per-job-chart';

const MyLineChart = dynamic(
  () => import('./line').then((mod) => mod.MyLineChart),
  { ssr: false }
);

export async function AvgWaitingPeriodsChart({ procedureCode = '1003P' }) {
  const averageWaitingTimePerJob =
    await getProcedureAvgWtPerJobChart(procedureCode);

  return (
    <MyLineChart
      lineDataKeys={['regular', 'fast', 'veryFast']}
      lineStrokes={['#987', '#8884d8', '#82ca9d']}
      chartData={averageWaitingTimePerJob.map((el) => ({
        ...el,
        date: new Date(el.date),
      }))}
      lineFriendlyNames={{
        regular: 'Običajno',
        fast: 'Hitro',
        veryFast: 'Zelo hitro',
      }}
    />
  );
}
