import type { Table as TTable, Column as TColumn } from '@tanstack/table-core';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Fragment } from 'react';

interface ColumnsTogglerProps<TData, TValue> {
  groupedColumns: GroupedByParent<TData, TValue>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: TTable<any>;
}
export function ColumnsToggler<TData, TValue>({
  groupedColumns,
  table,
}: ColumnsTogglerProps<TData, TValue>) {
  return (
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
          const groupLabel = table.options.meta?.headerTextMap?.get(key) ?? key;
          return (
            <Fragment key={key}>
              <DropdownMenuGroup>
                <DropdownMenuLabel className="capitalize">
                  {groupLabel}
                </DropdownMenuLabel>
                {columns.children.map((column) => {
                  const columnLabel =
                    table.options.meta?.headerTextMap?.get(column.id) ??
                    column.id;
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {columnLabel}
                    </DropdownMenuCheckboxItem>
                  );
                })}
                <DropdownMenuSeparator />
              </DropdownMenuGroup>
            </Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type GroupedByParent<TData, TValue> = Record<
  string,
  { column: TColumn<TData, TValue>; children: TColumn<TData, unknown>[] }
>;
export function groupByParent<TData, TValue>(
  columns: TColumn<TData, TValue>[]
) {
  const result: GroupedByParent<TData, TValue> = {};
  const groupedColumns = columns.reduce((acc, column) => {
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
  }, result);

  return groupedColumns;
}
