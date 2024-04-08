"use client";

import {
  Column,
  ColumnDef,
  SortingState,
  TableMeta,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/pagination";
import { Fragment, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { groupByParent, headerText, isKeyOfHeaderText } from "./columns";
import { DropdownMenuGroup } from "@radix-ui/react-dropdown-menu";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  meta?: TableMeta<TData>;
  initialState?: {
    sorting?: SortingState;
    columnVisibility?: VisibilityState;
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
    initialVisibilityState,
  );
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    meta: {
      ...meta,
      findProcedureMaxAllowedDays: (code: string) => {
        return meta?.allowedMaxWaitingTimes?.find(
          (procedure) => procedure.code === code,
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
      <div className="flex items-center py-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
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
      <div className="rounded-md border">
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
                            header.getContext(),
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
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
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
