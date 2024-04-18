import { createId } from '@paralleldrive/cuid2';
import { sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import { timestamps } from '../schema-common-fields';
import { relations } from 'drizzle-orm';
import { waitingPeriods } from './waiting-periods';

export const institutions = sqliteTable(
  'institutions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text('name').notNull(),
    ...timestamps,
  },
  (table) => {
    return {
      uniqueIndex: unique().on(table.name),
    };
  }
);

export const institutionsRelations = relations(institutions, ({ many }) => ({
  waitingPeriodSchema: many(waitingPeriods, {
    relationName: 'institutionWP',
  }),
}));

export type SelectInstitution = typeof institutions.$inferSelect;
export type InsertInstitution = typeof institutions.$inferInsert;
