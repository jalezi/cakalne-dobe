import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';
import { timestamps } from '../schema-common-fields';
import { jobs } from './jobs';
import { procedures } from './procedures';

export const maxAllowedDays = sqliteTable(
  'max_allowed_days',
  {
    regular: integer('regular').notNull(),
    fast: integer('fast').notNull(),
    veryFast: integer('very_fast').notNull(),
    jobId: text('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    procedureId: text('procedure_id')
      .notNull()
      .references(() => procedures.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => {
    return {
      pk: primaryKey({
        columns: [table.jobId, table.procedureId],
      }),
    };
  }
);

export type SelectMaxAllowedDays = typeof maxAllowedDays.$inferSelect;
export type InsertMaxAllowedDays = typeof maxAllowedDays.$inferInsert;
