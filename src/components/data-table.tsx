'use client';

import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  TableMeta,
  VisibilityState,
} from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTablePagination } from '@/components/pagination';
import { useState } from 'react';

import { groupByParent } from '../app/_components/columns';
import { DebouncedInput } from '@/components/debounced-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fuzzyFilter } from '@/lib/fuzzy-filter';
import { ColumnsToggler } from './columns-toggler';
import { MaxUrgency } from './max-urgency';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  meta?: TableMeta<TData>;
  initialState?: {
    sorting?: SortingState;
    columnVisibility?: VisibilityState;
    globalFilter?: string;
    columnFilters?: ColumnFiltersState;
  };
}

export function DataTable<TData, TValue>({
  columns,
  data,
  meta,
  initialState,
}: DataTableProps<TData, TValue>) {
  const initialSortingState = initialState?.sorting || [];
  const [sorting, setSorting] = useState<SortingState>(initialSortingState);
  const initialVisibilityState = initialState?.columnVisibility || {};
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    initialVisibilityState
  );
  const initialColumnFilters = initialState?.columnFilters || [];
  const [columnFilters, setColumnFilters] =
    useState<ColumnFiltersState>(initialColumnFilters);
  const initialGlobalFilter = initialState?.globalFilter || '';
  const [globalFilter, setGlobalFilter] = useState(initialGlobalFilter);

  const table = useReactTable({
    data,
    columns,
    filterFns: {
      fuzzy: fuzzyFilter,
    },
    state: {
      sorting,
      columnVisibility,
      globalFilter,
      columnFilters,
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    meta: {
      ...meta,
      findProcedureMaxAllowedDays: (code: string) => {
        return meta?.allowedMaxWaitingTimes?.find(
          (procedure) => procedure.code === code
        )?.maxAllowedDays;
      },
    },
    debugTable: true,
  });

  const flatColumns = table
    .getAllFlatColumns()
    .filter((column) => column.getCanHide());

  const groupedColumns = groupByParent(flatColumns);

  return (
    <>
      <div className="flex flex-wrap items-center gap-y-2">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <label htmlFor="global-table-filter" className="sr-only">
            išči po vseh stolpcih
          </label>
          <DebouncedInput
            type="search"
            id="global-table-filter"
            name="global-table-filter"
            placeholder="Išči po vseh stolpcih..."
            defaultValue={globalFilter}
            onChange={(event) => {
              setGlobalFilter(String(event.target.value));
            }}
            debounceTime={500}
          />
        </div>

        <div className="flex items-center space-x-2 sm:ml-auto">
          <p className="text-sm font-medium">Vrstic na stran</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-9 w-[4.375rem]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ColumnsToggler groupedColumns={groupedColumns} table={table} />
      </div>

      <div className="space-y-2 rounded-md border">
        <DataTablePagination table={table} />
        <Table>
          <caption className="sr-only">Čakalne dobe</caption>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const maxAllowedDays =
                    table.options.meta?.findProcedureMaxAllowedDays?.(
                      table.options.meta?.procedureCode ?? ''
                    );

                  const days =
                    maxAllowedDays && header.id in maxAllowedDays
                      ? maxAllowedDays[header.id as keyof typeof maxAllowedDays]
                      : null;

                  return (
                    <TableHead
                      key={header.id}
                      className="text-center"
                      colSpan={header.colSpan}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {days ? <MaxUrgency days={days} /> : null}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <DataTablePagination table={table} />
      </div>
    </>
  );
}
