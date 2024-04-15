import type { ProcedureWithMaxAllowedDays } from '@/lib/zod-schemas/data-schemas';
import { type RankingInfo } from '@tanstack/match-sorter-utils';
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
  interface FilterMeta {
    itemRank: RankingInfo;
  }
}

export type FetchResponse<
  TData = string | undefined,
  TError = 'Unknown error' | string | undefined,
  TMeta extends unknown | undefined = undefined,
> = {
  meta?: TMeta;
} & (
  | {
      success: true;
      data?: TData;
    }
  | {
      success: false;
      error: TError;
    }
);
