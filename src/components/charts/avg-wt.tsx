import { getProcedureAvgWtPerJobChart } from '@/actions/get-procedure-avg-wt-per-job-chart';
import { add, addDays, addMonths } from 'date-fns';
import { AverageWaitingTimeChart } from './wp/chart-01';
import type { SelectOption } from '../combo-box-responsive';
import { FIRST_DAY } from '@/lib/constants';

interface AvgWTChartProps {
  procedureCode: string;
  procedureOptions: SelectOption[];
}

export async function AvgWTChart({
  procedureCode,
  procedureOptions,
}: AvgWTChartProps) {
  const toDate = new Date();
  const fromDate =
    addMonths(addDays(toDate, 1), -1) > FIRST_DAY
      ? addMonths(addDays(toDate, 1), -1)
      : FIRST_DAY;

  const chartData = await getProcedureAvgWtPerJobChart(
    procedureCode,
    toDate,
    fromDate
  );

  if (chartData.length === 0) {
    return (
      <div className="grid min-h-[480px] place-items-center">Ni podatkov</div>
    );
  }

  return (
    <AverageWaitingTimeChart
      lineDatakeys={['regular', 'fast', 'veryFast']}
      initialData={chartData}
      initialDateRange={{
        to: toDate,
        from: fromDate,
      }}
      procedureOptions={procedureOptions}
      initialProcedure={procedureCode}
    />
  );
}
