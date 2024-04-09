import type { ProcedureWithMaxAllowedDays } from '@/lib/zod-schemas/data-schemas';
import type { FilterFn, RowData } from '@tanstack/react-table';

declare module '@tanstack/table-core' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    allowedMaxWaitingTimes?: ProcedureWithMaxAllowedDays[];
    findProcedureMaxAllowedDays?: (
      code: string
    ) => ProcedureWithMaxAllowedDays['maxAllowedDays'] | undefined;
  }
  interface FilterFns {
    fuzzy: FilterFn<unknown>;
  }
}
