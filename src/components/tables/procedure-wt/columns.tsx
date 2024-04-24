'use client';

import { cn } from '@/lib/utils';
import type { FacilityProcedureWaitingTimes } from '@/lib/zod-schemas/data-schemas';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/table-header';

import type {
  Column as TColumn,
  Table as TTable,
  Row as TRow,
} from '@tanstack/react-table';
import { fuzzySort } from '@/lib/fuzzy-filter';
import { MaxUrgency } from '@/components/max-urgency';

export type ProcedureWTPerInstTable = FacilityProcedureWaitingTimes;

const columnHelper = createColumnHelper<ProcedureWTPerInstTable>();

const isNumber = (value: unknown): value is number => typeof value === 'number';

export const HEADER_TEXT_MAP = {
  procedure: 'Storitev',
  waitingPeriods: 'Stopnja nujnosti',
  code: 'Koda',
  name: 'Naziv',
  facility: 'Ustanova',
  facilityName: 'Ime',
  regular: 'Običajno',
  fast: 'Hitro',
  veryFast: 'Zelo hitro',
  codeWithName: 'Postopek',
} as const;

export const isKeyOfHeaderText = (
  key: string
): key is keyof typeof HEADER_TEXT_MAP => key in HEADER_TEXT_MAP;

export const columns: ColumnDef<ProcedureWTPerInstTable>[] = [
  columnHelper.group({
    id: 'procedure',
    header: HEADER_TEXT_MAP.procedure,
    enableHiding: false,
    columns: [
      {
        id: 'codeWithName',
        accessorFn: (originalRow) =>
          `${originalRow.procedure.code} - ${originalRow.procedure.name}`,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={HEADER_TEXT_MAP.codeWithName}
            className="justify-center"
          />
        ),
        filterFn: 'fuzzy',
        sortingFn: fuzzySort,
      },
    ],
  }),
  columnHelper.group({
    id: 'facility',
    header: HEADER_TEXT_MAP.facility,
    enableHiding: false,
    columns: [
      {
        id: 'facilityName',

        accessorFn: (originalRow) => originalRow.facility,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={HEADER_TEXT_MAP.facilityName}
            className="justify-center"
          />
        ),
        sortingFn: 'text',
      },
    ],
  }),
  columnHelper.group({
    id: 'waitingPeriods',
    header: HEADER_TEXT_MAP.waitingPeriods,
    enableHiding: false,
    columns: [
      {
        id: 'regular',
        accessorFn: (originalRow) => originalRow.waitingPeriods.regular,
        header: UrgencyHeader,
        cell: UrgencyCell,
        sortingFn: 'alphanumeric',
      },
      {
        id: 'fast',
        accessorFn: (originalRow) => originalRow.waitingPeriods.fast,
        header: UrgencyHeader,
        cell: UrgencyCell,
        sortingFn: 'alphanumeric',
      },
      {
        id: 'veryFast',
        accessorFn: (originalRow) => originalRow.waitingPeriods.veryFast,
        header: UrgencyHeader,
        cell: UrgencyCell,
        sortingFn: 'alphanumeric',
      },
    ],
  }),
];

type ColumnHeaderProps = {
  column: TColumn<ProcedureWTPerInstTable>;
  table: TTable<ProcedureWTPerInstTable>;
};

function UrgencyHeader({ column, table }: ColumnHeaderProps) {
  const procedureCode = table.options.meta?.procedureCode;
  const maxAllowedDays = table.options.meta?.allowedMaxWaitingTimes?.find(
    (procedure) => procedure.code === procedureCode
  )?.maxAllowedDays;

  const days = maxAllowedDays?.[column.id as 'regular' | 'fast' | 'veryFast'];

  return (
    <DataTableColumnHeader
      column={column}
      title={HEADER_TEXT_MAP.regular}
      className="justify-center"
    >
      {days ? <MaxUrgency days={days} urgency="regular" /> : null}
    </DataTableColumnHeader>
  );
}

type ColumnCellProps = {
  row: TRow<ProcedureWTPerInstTable>;
  table: TTable<ProcedureWTPerInstTable>;
};

function UrgencyCell({ row, table }: ColumnCellProps) {
  const procedureCode = row.original.procedure.code;
  const maxAllowedDays = table.options.meta?.allowedMaxWaitingTimes?.find(
    (procedure) => procedure.code === procedureCode
  )?.maxAllowedDays;
  const maxDays = maxAllowedDays?.regular;
  const days = row.original.waitingPeriods.regular;
  const isExceeded = days && maxDays ? days > maxDays : false;
  return (
    <div className={cn(isExceeded && 'text-red-600', 'text-center')}>
      {isNumber(days) ? days : '-'}
    </div>
  );
}
