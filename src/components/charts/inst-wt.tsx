import type { SelectOption } from '../combo-box-responsive';
import { getProcedureWtForInstOnDay } from '@/actions/get-procedure-wt-for-inst-on-day';
import { ProcedureWtByInstOnDayChart } from './wp/chart-02';

interface InstWTChartProps {
  procedureCode: string;
  procedureOptions: SelectOption[];

  validDates: string[];
}

export async function InstWTChart({
  procedureCode,
  procedureOptions,

  validDates,
}: InstWTChartProps) {
  const date = new Date(validDates[0]);
  const chartData = await getProcedureWtForInstOnDay(
    procedureOptions[0].value,
    date
  );

  if (chartData.length === 0) {
    return (
      <div className="grid min-h-[480px] place-items-center">Ni podatkov</div>
    );
  }

  return (
    <ProcedureWtByInstOnDayChart
      lineDatakeys={['regular', 'fast', 'veryFast']}
      initialData={chartData}
      procedureOptions={procedureOptions}
      initialProcedure={procedureCode}
      validDates={validDates}
    />
  );
}
