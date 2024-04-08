"use client";

import { cn } from "@/lib/utils";
import { FacilityProcedureWaitingTimes } from "@/lib/zod-schemas/data-schemas";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "./table-header";

import type { Column as TColumn } from "@tanstack/react-table";

export type Column = FacilityProcedureWaitingTimes;

const columnHelper = createColumnHelper<Column>();

export const headerText = {
  procedure: "Storitev",
  waitingPeriods: "Stopnja nujnosti",
  code: "Koda",
  name: "Naziv",
  facility: "Ustanova",
  regular: "Običajno",
  fast: "Hitro",
  veryFast: "Zelo hitro",
} as const;

export const isKeyOfHeaderText = (
  key: string,
): key is keyof typeof headerText => key in headerText;

export const columns: ColumnDef<Column>[] = [
  columnHelper.group({
    id: "procedure",
    header: "Storitev",
    enableHiding: false,
    columns: [
      {
        id: "code",
        accessorFn: (originalRow) => originalRow.procedure.code,
        header: ({ column }) => {
          return (
            <DataTableColumnHeader
              column={column}
              title={headerText.code}
              className="justify-center"
            />
          );
        },
        sortingFn: "alphanumericCaseSensitive",
      },
      {
        id: "name",
        accessorFn: (originalRow) => originalRow.procedure.name,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={headerText.name}
            className="justify-center"
          />
        ),
        sortingFn: "text",
      },
    ],
  }),
  columnHelper.group({
    id: "facility",
    enableHiding: false,
    columns: [
      {
        id: "facility",

        accessorFn: (originalRow) => originalRow.facility,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={headerText.facility}
            className="justify-center"
          />
        ),
        sortingFn: "text",
      },
    ],
  }),
  columnHelper.group({
    id: "waitingPeriods",
    header: "Stopnja nujnosti",
    enableHiding: false,
    columns: [
      {
        id: "regular",
        accessorFn: (originalRow) => originalRow.waitingPeriods.regular,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={headerText.regular}
            className="justify-center"
          />
        ),
        cell: ({ row, table }) => {
          const maxAllowedDays =
            table.options.meta?.findProcedureMaxAllowedDays?.(
              row.original.procedure.code,
            );
          const maxDays = maxAllowedDays?.regular;
          const days = row.original.waitingPeriods.regular;
          const isExceeded = days && maxDays ? days > maxDays : false;
          return (
            <div className={cn(isExceeded && "text-red-600", "text-center")}>
              {days ? days : "-"}
            </div>
          );
        },
        sortingFn: "alphanumeric",
      },
      {
        id: "fast",
        accessorFn: (originalRow) => originalRow.waitingPeriods.fast,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={headerText.fast}
            className="justify-center"
          />
        ),
        cell: ({ row, table }) => {
          const maxAllowedDays =
            table.options.meta?.findProcedureMaxAllowedDays?.(
              row.original.procedure.code,
            );
          const maxDays = maxAllowedDays?.fast;
          const days = row.original.waitingPeriods.fast;
          const isExceeded = days && maxDays ? days > maxDays : false;
          return (
            <div className={cn(isExceeded && "text-red-600", "text-center")}>
              {days ? days : "-"}
            </div>
          );
        },
        sortingFn: "alphanumeric",
      },
      {
        id: "veryFast",
        accessorFn: (originalRow) => originalRow.waitingPeriods.veryFast,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={headerText.veryFast}
            className="justify-center"
          />
        ),
        cell: ({ row, table }) => {
          const maxAllowedDays =
            table.options.meta?.findProcedureMaxAllowedDays?.(
              row.original.procedure.code,
            );
          const maxDays = maxAllowedDays?.veryFast;
          const days = row.original.waitingPeriods.veryFast;
          const isExceeded = days && maxDays ? days > maxDays : false;
          return (
            <div className={cn(isExceeded && "text-red-600", "text-center")}>
              {days ? days : "-"}
            </div>
          );
        },
        sortingFn: "alphanumeric",
      },
    ],
  }),
];

export function groupByParent<TData, TValue>(
  columns: TColumn<TData, TValue>[],
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
    >,
  );

  return groupedColumns;
}
