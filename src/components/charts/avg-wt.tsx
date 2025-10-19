import { addDays, addMonths, format } from 'date-fns';
import { AverageWaitingTimeChart } from './wp/chart-01';
import type { SelectOption } from '../combo-box-responsive';
import { getProcedureAvgWtPerJobChart } from '@/actions/get-procedure-avg-wt-per-job-chart';
import { FIRST_DAY } from '@/lib/constants';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

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

  const result = await getProcedureAvgWtPerJobChart(
    procedureCode,
    toDate,
    fromDate
  );

  if (result.data.length === 0) {
    return (
      <div className="grid min-h-[480px] place-items-center">Ni podatkov</div>
    );
  }

  return (
    <>
      {result.isFallback && result.actualFromDate && result.actualToDate && (
        <Alert className="mb-4">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Prikazani so podatki iz drugega obdobja</AlertTitle>
          <AlertDescription>
            Za izbrano obdobje ni podatkov. Prikazani so najnovejši
            razpoložljivi podatki iz obdobja{' '}
            {format(result.actualFromDate, 'dd.MM.yyyy')} -{' '}
            {format(result.actualToDate, 'dd.MM.yyyy')}.
          </AlertDescription>
        </Alert>
      )}
      <AverageWaitingTimeChart
        lineDatakeys={['regular', 'fast', 'veryFast']}
        initialData={result.data}
        initialDateRange={{
          to:
            result.isFallback && result.actualToDate
              ? result.actualToDate
              : toDate,
          from:
            result.isFallback && result.actualFromDate
              ? result.actualFromDate
              : fromDate,
        }}
        procedureOptions={procedureOptions}
        initialProcedure={procedureCode}
      />
    </>
  );
}
