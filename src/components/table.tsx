import { makeFacilityRows } from '@/lib/make-facility-row';
import { DataTable } from './data-table';
import { makeProcedureMaxAllowedWaiting } from '@/lib/make-procedure-max-allowed-waiting';
import { allDataSchema } from '@/lib/zod-schemas/data-schemas';
import { columns } from '@/app/_components/columns';

const BASE_URL = 'https://mitar.gitlab.io/-/cakalne-dobe/-/jobs';
const JSON_OUT_PATH = '/artifacts/out.json';

interface TableProps {
  jsonId: string;
}

export async function Table({ jsonId }: TableProps) {
  let fileResponse: Response | undefined;
  let data: unknown | undefined;
  try {
    fileResponse = await fetch(`${BASE_URL}/${jsonId}${JSON_OUT_PATH}`);
    if (!fileResponse.ok) {
      throw new Error('Failed to fetch data');
    }
    data = await fileResponse.json();
  } catch (error) {
    throw new Error('Unknown error');
  }

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
        sorting: [{ id: 'code', desc: false }],
      }}
    />
  );
}
