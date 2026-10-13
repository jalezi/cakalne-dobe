import type { ResultSet } from '@libsql/client';
import type { TablesRelationalConfig } from 'drizzle-orm';
import type { SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import type * as schema from '@/db/schema';

export type {
  Result as ReturnType,
  SnapshotInsertPayload,
} from '@/types';

// biome-ignore lint/suspicious/noExplicitAny: We will fix in the future
export type Trx<TSchema extends TablesRelationalConfig = any> =
  SQLiteTransaction<'async', ResultSet, typeof schema, TSchema>;
