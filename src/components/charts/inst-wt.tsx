import type { SelectOption } from '../combo-box-responsive';
import { getProcedureWtForInstOnDay } from '@/actions/get-procedure-wt-for-inst-on-day';
import { ProcedureWtByInstOnDayChart } from './wp/chart-02';

interface InstWTChartProps {
  procedureCode: string;
  procedureOptions: SelectOption[];
}

export async function InstWTChart({
  procedureCode,
  procedureOptions,
}: InstWTChartProps) {
  const toDate = new Date();

  const chartData = await getProcedureWtForInstOnDay(
    procedureOptions[0].value,
    toDate
  );

  return (
    <ProcedureWtByInstOnDayChart
      lineDatakeys={['regular', 'fast', 'veryFast']}
      initialData={chartData}
      initialDate={toDate}
      procedureOptions={procedureOptions}
      initialProcedure={procedureCode}
    />
  );
}
