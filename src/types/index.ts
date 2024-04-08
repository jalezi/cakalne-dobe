import { ProcedureWithMaxAllowedDays } from "@/lib/zod-schemas/data-schemas";
import { FilterFn, RowData } from "@tanstack/react-table";

declare module "@tanstack/table-core" {
  interface TableMeta<TData extends RowData> {
    allowedMaxWaitingTimes?: ProcedureWithMaxAllowedDays[];
    findProcedureMaxAllowedDays?: (
      code: string,
    ) => ProcedureWithMaxAllowedDays["maxAllowedDays"] | undefined;
  }
  interface FilterFns {
    fuzzy: FilterFn<unknown>;
  }
}
