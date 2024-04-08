"use client";

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
  },
  {
    accessorFn: (originalRow) => originalRow.waitingPeriods.fast,
    header: "Hitro",
  },
  {
    accessorFn: (originalRow) => originalRow.waitingPeriods.veryFast,
    header: "Zelo hitro",
  },
];
