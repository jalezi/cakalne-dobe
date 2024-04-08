'use client';

import {
  ColumnDef,
  FilterFn,
  SortingState,
  TableMeta,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { rankItem } from '@tanstack/match-sorter-utils';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTablePagination } from '@/components/pagination';
import { Fragment, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { groupByParent, headerText, isKeyOfHeaderText } from './columns';
import { DropdownMenuGroup } from '@radix-ui/react-dropdown-menu';
import { Input } from '@/components/ui/input';
import { DebouncedInput } from '@/components/debounced-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  // Rank the item
  console.log(row);
  const itemRank = rankItem(row.getValue(columnId), value);

  // Store the itemRank info
  addMeta({
    itemRank,
  });

  // Return if the item should be filtered in/out
  return itemRank.passed;
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  meta?: TableMeta<TData>;
  initialState?: {
    sorting?: SortingState;
    columnVisibility?: VisibilityState;
    globalFilter?: string;
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
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    // getFacetedRowModel: getFacetedRowModel(),
    // getFacetedUniqueValues: getFacetedUniqueValues(),
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
            placeholder="Išči po vseh stolpcih..."
            defaultValue={globalFilter}
            onChange={(event) => {
              setGlobalFilter(String(event.target.value));
            }}
            debounceTime={500}
          />
        </div>

        <div className="flex items-center space-x-2 sm:ml-auto">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-9 w-[70px]">
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto sm:ml-2">
              Stolpci
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuCheckboxItem
              className="capitalize"
              checked={table.getIsAllColumnsVisible()}
              onCheckedChange={table.getToggleAllColumnsVisibilityHandler()}
            >
              Vsi
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            {Object.entries(groupedColumns).map(([key, columns]) => {
              const isParentKey = isKeyOfHeaderText(key);
              return (
                <Fragment key={key}>
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>
                      {isParentKey ? headerText[key] : key}
                    </DropdownMenuLabel>
                    {columns.children.map((column) => {
                      const { id } = column;
                      const isChildKey = isKeyOfHeaderText(id);
                      return (
                        <DropdownMenuCheckboxItem
                          key={id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) =>
                            column.toggleVisibility(!!value)
                          }
                        >
                          {isChildKey ? headerText[id] : id}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                  </DropdownMenuGroup>
                </Fragment>
              );
            })}
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                // console.log(column.getLeafColumns());
                return column.getLeafColumns().map((leafColumn) => {
                  const { id } = leafColumn;
                  const isKey = isKeyOfHeaderText(id);
                  return (
                    <DropdownMenuCheckboxItem
                      key={leafColumn.id}
                      className="capitalize"
                      checked={leafColumn.getIsVisible()}
                      onCheckedChange={(value) =>
                        leafColumn.toggleVisibility(!!value)
                      }
                    >
                      {isKey ? headerText[id] : id}
                    </DropdownMenuCheckboxItem>
                  );
                });
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2 rounded-md border">
        <DataTablePagination table={table} />
        <Table>
          <caption className="sr-only">Čakalne dobe</caption>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
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
                  className="h-24 bg-red-200 text-center"
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
