import { createId } from '@paralleldrive/cuid2';

import { timestamps } from '../schema-common-fields';
import { sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import { maxWaitingPeriods } from './max-waiting-periods';
import { relations } from 'drizzle-orm';
import { waitingPeriods } from './waiting-periods';

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

export const proceduresRelations = relations(procedures, ({ many }) => ({
  maxWaitingPeriods: many(maxWaitingPeriods, {
    relationName: 'procedureMWP',
  }),
  waitingPeriods: many(waitingPeriods, {
    relationName: 'procedureWP',
  }),
}));

export type InsertProcedure = typeof procedures.$inferInsert;
export type SelectProcedure = typeof procedures.$inferSelect;
