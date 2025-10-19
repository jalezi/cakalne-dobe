import type { ResultSet } from '@libsql/client';
import type { TablesRelationalConfig } from 'drizzle-orm';
import type { SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import type * as schema from '@/db/schema';

export type ReturnType<
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

// biome-ignore lint/suspicious/noExplicitAny: We will fix in the future
export type Trx<TSchema extends TablesRelationalConfig = any> =
  SQLiteTransaction<'async', ResultSet, typeof schema, TSchema>;

export type NotCompleteDataByTable = {
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
