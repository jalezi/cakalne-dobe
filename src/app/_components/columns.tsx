"use client";

import { cn } from "@/lib/utils";
import { FacilityProcedureWaitingTimes } from "@/lib/zod-schemas/data-schemas";
import type { ColumnDef } from "@tanstack/react-table";

export type Column = FacilityProcedureWaitingTimes;

export const columns: ColumnDef<Column>[] = [
  {
    accessorFn: (originalRow) => originalRow.procedure.code,
    header: "Koda",
  },
  {
    accessorFn: (originalRow) => originalRow.procedure.name,
    header: "Naziv",
  },
  {
    accessorFn: (originalRow) => originalRow.facility,
    header: "Ustanova",
  },
  {
    accessorFn: (originalRow) => originalRow.waitingPeriods.regular,
    header: "Običajno",
    cell: ({ row, table }) => {
      const maxAllowedDays = table.options.meta?.findProcedureMaxAllowedDays?.(
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
  },
  {
    accessorFn: (originalRow) => originalRow.waitingPeriods.fast,
    header: "Hitro",
    cell: ({ row, table }) => {
      const maxAllowedDays = table.options.meta?.findProcedureMaxAllowedDays?.(
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
  },
  {
    accessorFn: (originalRow) => originalRow.waitingPeriods.veryFast,
    header: "Zelo hitro",
    cell: ({ row, table }) => {
      const maxAllowedDays = table.options.meta?.findProcedureMaxAllowedDays?.(
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
  },
];
