import { type RankingInfo } from '@tanstack/match-sorter-utils';
import type { FilterFn, RowData } from '@tanstack/react-table';
import type * as schema from '@/db/schema';
import type { ProcedureWithMaxAllowedDays } from '@/lib/zod-schemas/data-schemas';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    allowedMaxWaitingTimes?: ProcedureWithMaxAllowedDays[];
    procedureCode?: string;
    headerTextMap?: Map<string, string>;
    day?: string;
  }
  interface FilterFns {
    fuzzy: FilterFn<unknown>;
  }
  interface FilterMeta {
    itemRank: RankingInfo;
  }
}

export type ActionReturnType<
  TData,
  TMeta extends Record<string, unknown> | undefined = Record<string, unknown>,
  TDetails extends Record<string, unknown> | undefined = Record<
    string,
    unknown
  >,
> =
  | {
      success: true;
      data: TData;
      meta?: TMeta;
    }
  | {
      success: false;
      error: string;
      details?: TDetails;
    };

export type SnapshotInsertPayload = {
  procedures: Pick<schema.InsertProcedure, 'code' | 'name'>[];
  institutions: Map<string, Pick<schema.InsertInstitution, 'name'>>;
  maxAllowedDays: (Pick<
    schema.InsertMaxAllowedDays,
    'fast' | 'regular' | 'veryFast' | 'jobId'
  > & { procedureCode: string })[];
  waitingPeriods: Map<
    string,
    Pick<
      schema.InsertWaitingPeriods,
      'fast' | 'regular' | 'veryFast' | 'jobId'
    > & {
      institutionName: string;
      procedureCode: string;
    }
  >;
};

export type FetchResponse<
  TData = null,
  TError = 'Unknown error' | string | undefined,
  TMeta extends unknown | undefined = undefined,
> = {
  meta?: TMeta;
} & (
  | {
      success: true;
      data: TData extends undefined ? null : TData;
    }
  | {
      success: false;
      error: TError;
    }
);
