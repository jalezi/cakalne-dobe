import { makeFacilityRows } from '@/lib/make-facility-row';
import { DataTable } from './data-table';
import { makeProcedureMaxAllowedWaiting } from '@/lib/make-procedure-max-allowed-waiting';
import { allDataSchema } from '@/lib/zod-schemas/data-schemas';
import { columns } from '@/app/_components/columns';
import { getJson } from '@/utils/get-json';

interface TableProps {
  jsonId: string;
}

export async function Table({ jsonId }: TableProps) {
  const data = await getJson(jsonId);

  const parsedData = allDataSchema.safeParse(data);
  if (!parsedData.success) {
    console.error(parsedData.error.errors);
    throw new Error('Invalid data');
  }

  const allData = parsedData.data;
  const { procedures } = allData;
  const rows = makeFacilityRows(procedures);
  const allowedMaxWaitingTimes = makeProcedureMaxAllowedWaiting(procedures);

  return (
    <DataTable
      data={rows}
      columns={columns}
      meta={{ allowedMaxWaitingTimes }}
      initialState={{
        sorting: [{ id: 'codeWithName', desc: false }],
      }}
    />
  );
}
