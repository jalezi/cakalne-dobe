import { createId } from '@paralleldrive/cuid2';
import { sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import { timestamps } from '../schema-common-fields';

export const procedures = sqliteTable(
  'procedures',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    code: text('code').notNull(),
    name: text('name').notNull(),
    ...timestamps,
  },
  (table) => {
    return {
      procedureCodeIndex: unique().on(table.code),
      procedureNameIndex: unique().on(table.name),
      procedureCodeNameIndex: unique().on(table.code, table.name),
    };
  }
);

export type InsertProcedure = typeof procedures.$inferInsert;
export type SelectProcedure = typeof procedures.$inferSelect;
