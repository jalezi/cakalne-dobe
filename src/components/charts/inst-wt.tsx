import { SelectOption } from '../combo-box-responsive';
import { getProcedureWtForInstOnDay } from '@/actions/get-procedure-wt-for-inst-on-day';
import { ProcedureWtByInstOnDayChart } from './wp/chart-02';

interface InstWTProps {
  procedureCode: string;
  procedureOptions: SelectOption[];
}

export async function InstWT({ procedureCode, procedureOptions }: InstWTProps) {
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
