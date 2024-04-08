"use client";

import type { ColumnDef } from "@tanstack/react-table";

export type SomeColumn = {
  code: string;
  name: string;
};

export const columns: ColumnDef<SomeColumn>[] = [
  {
    accessorKey: "code",
    header: "Koda",
  },
  {
    accessorKey: "name",
    header: "Naziv",
  },
];
