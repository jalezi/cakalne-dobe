import { makeFacilityRows } from '@/lib/make-facility-row';
import { DataTable } from './data-table';
import { makeProcedureMaxAllowedWaiting } from '@/lib/make-procedure-max-allowed-waiting';
import { columns } from '@/app/_components/columns';
import { getJson } from '@/utils/get-json';

interface TableProps {
  jsonId: string;
  procedureCode?: string | null;
}

export async function Table({ jsonId, procedureCode }: TableProps) {
  const { procedures } = await getJson(jsonId);
  const rows = makeFacilityRows(procedures);
  const allowedMaxWaitingTimes = makeProcedureMaxAllowedWaiting(procedures);
  const procedureName = procedures.find((procedure) => {
    return procedure.code === procedureCode;
  })?.name;

  return (
    <DataTable
      data={rows}
      columns={columns}
      meta={{ allowedMaxWaitingTimes }}
      initialState={{
        sorting: [{ id: 'codeWithName', desc: false }],
        columnFilters: procedureName
          ? [
              {
                id: 'codeWithName',
                value: `${procedureCode} - ${procedureName}`,
              },
            ]
          : undefined,
        columnVisibility: procedureName
          ? {
              codeWithName: false,
            }
          : undefined,
      }}
    />
  );
}
