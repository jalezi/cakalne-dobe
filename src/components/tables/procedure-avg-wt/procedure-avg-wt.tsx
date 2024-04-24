import { getProcedureAvgWtForJob } from '@/actions/get-procedure-avg-wt-for-job';
import { DataTable } from '@/components/data-table';
import { columns } from './columns';

interface ProcedureAvgWTTableProps {
  dbJobId: string;
}

export async function ProcedureAvgWTTable({
  dbJobId,
}: ProcedureAvgWTTableProps) {
  const rows = await getProcedureAvgWtForJob({ jobId: dbJobId });

  return <DataTable data={rows} columns={columns} />;
}
