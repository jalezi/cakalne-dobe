import { getProcedureAvgWtForJob } from '@/actions/get-procedure-avg-wt-for-job';
import { DataTable } from '@/components/data-table';
import { columns, headerTextMap } from './columns';

interface ProcedureAvgWTTableProps {
  dbJobId: string;
  day: string;
}

export async function ProcedureAvgWTTable({
  dbJobId,
  day,
}: ProcedureAvgWTTableProps) {
  const rows = await getProcedureAvgWtForJob({ jobId: dbJobId });

  return (
    <DataTable data={rows} columns={columns} meta={{ headerTextMap, day }} />
  );
}
