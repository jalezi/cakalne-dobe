"use client";

import { cn } from "@/lib/utils";
import { FacilityProcedureWaitingTimes } from "@/lib/zod-schemas/data-schemas";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "./table-header";

export type Column = FacilityProcedureWaitingTimes;

const columnHelper = createColumnHelper<Column>();

export const columns: ColumnDef<Column>[] = [
  columnHelper.group({
    id: "procedure",
    header: "Storitev",
    columns: [
      {
        id: "code",
        accessorFn: (originalRow) => originalRow.procedure.code,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Koda"
            className="justify-center"
          />
        ),
        sortingFn: "alphanumericCaseSensitive",
      },
      {
        id: "name",
        accessorFn: (originalRow) => originalRow.procedure.name,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Naziv"
            className="justify-center"
          />
        ),
        sortingFn: "text",
      },
    ],
  }),
  columnHelper.group({
    id: "facility",
    columns: [
      {
        id: "facility",
        accessorFn: (originalRow) => originalRow.facility,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Ustanova"
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
    columns: [
      {
        id: "regular",
        accessorFn: (originalRow) => originalRow.waitingPeriods.regular,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Običajno"
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
            title="Hitro"
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
            title="Zelo hitro"
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
