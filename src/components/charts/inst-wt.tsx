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

  if (chartData.length === 0) {
    return (
      <div className="grid min-h-[480px] place-items-center">Ni podatkov</div>
    );
  }

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
