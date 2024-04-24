'use client';

import { DataTableColumnHeader } from '@/components/table-header';
import { Button } from '@/components/ui/button';
import type { ProcedureAvgWaitingTimes } from '@/lib/zod-schemas/data-schemas';
import type { ColumnDef } from '@tanstack/table-core';

import { createColumnHelper } from '@tanstack/table-core';
import Link from 'next/link';

const columnHelper = createColumnHelper<ProcedureAvgWaitingTimes>();

export const HEADER_TEXT_MAP = {
  all: 'Vsi',
  procedure: 'Storitev',
  avg: 'Povprečje',
  regular: 'Običajno',
  fast: 'Hitro',
  veryFast: 'Zelo hitro',
  codeWithName: 'Postopek',
} as const;

type HeaderTextMap = typeof HEADER_TEXT_MAP;
type Key = keyof HeaderTextMap;

export const headerTextMap = new Map<Key, string>(
  Object.entries(HEADER_TEXT_MAP) as [Key, string][]
);

export const columns: ColumnDef<ProcedureAvgWaitingTimes>[] = [
  columnHelper.group({
    id: 'procedure',
    header: HEADER_TEXT_MAP.procedure,
    enableHiding: false,
    columns: [
      {
        id: 'codeWithName',
        accessorFn: (originalRow) =>
          `${originalRow.procedureCode} - ${originalRow.procedureName}`,
        header: ({ column }) => {
          return (
            <DataTableColumnHeader
              column={column}
              title={HEADER_TEXT_MAP.codeWithName}
              className="justify-center"
            />
          );
        },
        cell: ({ cell, row }) => (
          <Button asChild variant="link" className="h-auto py-0">
            <Link href={`/${row.original.jobId}/${row.original.procedureCode}`}>
              {cell.getValue()}
            </Link>
          </Button>
        ),
        filterFn: 'fuzzy',
      },
    ],
  }),
  columnHelper.group({
    id: 'avg',
    header: HEADER_TEXT_MAP.avg,
    enableHiding: false,
    columns: [
      {
        id: 'regular',
        accessorFn: (originalRow) => originalRow.avg.regular?.toFixed(2) ?? '-',
        header: ({ column }) => {
          return (
            <DataTableColumnHeader
              column={column}
              title={HEADER_TEXT_MAP.regular}
            />
          );
        },
        cell: ({ cell }) => {
          return <div className="text-center">{cell.getValue()}</div>;
        },
      },
      {
        id: 'fast',
        accessorFn: (originalRow) => originalRow.avg.fast?.toFixed(2) ?? '-',
        header: ({ column }) => {
          return (
            <DataTableColumnHeader
              column={column}
              title={HEADER_TEXT_MAP.fast}
              className="justify-center"
            />
          );
        },
        cell: ({ cell }) => {
          return <div className="text-center">{cell.getValue()}</div>;
        },
      },
      {
        id: 'veryFast',
        accessorFn: (originalRow) =>
          originalRow.avg.veryFast?.toFixed(2) ?? '-',
        header: ({ column }) => {
          return (
            <DataTableColumnHeader
              column={column}
              title={HEADER_TEXT_MAP.veryFast}
              className="justify-center"
            />
          );
        },
        cell: ({ cell }) => {
          return <div className="text-center">{cell.getValue()}</div>;
        },
      },
    ],
  }),
];
