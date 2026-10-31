import type * as schema from '@/db/schema';

export type Result<TData, TMeta = undefined> =
  | { success: true; data: TData }
  | { success: false; error: { code: string; message: string }; meta?: TMeta };

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
