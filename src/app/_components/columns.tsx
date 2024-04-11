'use client';

import { cn } from '@/lib/utils';
import type { FacilityProcedureWaitingTimes } from '@/lib/zod-schemas/data-schemas';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/table-header';

import type { Column as TColumn } from '@tanstack/react-table';
import { fuzzySort } from '@/lib/fuzzy-filter';

export type Column = FacilityProcedureWaitingTimes;

const columnHelper = createColumnHelper<Column>();

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

export const columns: ColumnDef<Column>[] = [
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
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={HEADER_TEXT_MAP.regular}
            className="justify-center"
          />
        ),
        cell: ({ row, table }) => {
          const maxAllowedDays =
            table.options.meta?.findProcedureMaxAllowedDays?.(
              row.original.procedure.code
            );
          const maxDays = maxAllowedDays?.regular;
          const days = row.original.waitingPeriods.regular;
          const isExceeded = days && maxDays ? days > maxDays : false;
          return (
            <div className={cn(isExceeded && 'text-red-600', 'text-center')}>
              {days ? days : '-'}
            </div>
          );
        },
        sortingFn: 'alphanumeric',
      },
      {
        id: 'fast',
        accessorFn: (originalRow) => originalRow.waitingPeriods.fast,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={HEADER_TEXT_MAP.fast}
            className="justify-center"
          />
        ),
        cell: ({ row, table }) => {
          const maxAllowedDays =
            table.options.meta?.findProcedureMaxAllowedDays?.(
              row.original.procedure.code
            );
          const maxDays = maxAllowedDays?.fast;
          const days = row.original.waitingPeriods.fast;
          const isExceeded = days && maxDays ? days > maxDays : false;
          return (
            <div className={cn(isExceeded && 'text-red-600', 'text-center')}>
              {days ? days : '-'}
            </div>
          );
        },
        sortingFn: 'alphanumeric',
      },
      {
        id: 'veryFast',
        accessorFn: (originalRow) => originalRow.waitingPeriods.veryFast,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={HEADER_TEXT_MAP.veryFast}
            className="justify-center"
          />
        ),
        cell: ({ row, table }) => {
          const maxAllowedDays =
            table.options.meta?.findProcedureMaxAllowedDays?.(
              row.original.procedure.code
            );
          const maxDays = maxAllowedDays?.veryFast;
          const days = row.original.waitingPeriods.veryFast;
          const isExceeded = days && maxDays ? days > maxDays : false;
          return (
            <div className={cn(isExceeded && 'text-red-600', 'text-center')}>
              {days ? days : '-'}
            </div>
          );
        },
        sortingFn: 'alphanumeric',
      },
    ],
  }),
];

export function groupByParent<TData, TValue>(
  columns: TColumn<TData, TValue>[]
) {
  const groupedColumns = columns.reduce(
    (acc, column) => {
      const parentColumn = column.parent;
      if (!parentColumn) {
        return acc;
      }

      if (!acc[parentColumn.id]) {
        acc[parentColumn.id] = {
          column: parentColumn,
          children: [],
        };
      }

      acc[parentColumn.id].children.push(column);

      return acc;
    },
    {} as Record<
      string,
      { column: TColumn<TData, unknown>; children: TColumn<TData, unknown>[] }
    >
  );

  return groupedColumns;
}
