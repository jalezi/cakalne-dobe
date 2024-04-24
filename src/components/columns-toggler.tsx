import {
  HEADER_TEXT_MAP,
  isKeyOfHeaderText,
} from '@/components/tables/procedure-wt/columns';
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
          const isParentKey = isKeyOfHeaderText(key);
          return (
            <Fragment key={key}>
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  {isParentKey ? HEADER_TEXT_MAP[key] : key}
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
                      {isChildKey ? HEADER_TEXT_MAP[id] : id}
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
                  {isKey ? HEADER_TEXT_MAP[id] : id}
                </DropdownMenuCheckboxItem>
              );
            });
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
