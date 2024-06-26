import { sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import { timestamps } from '../schema-common-fields';
import { relations } from 'drizzle-orm';
import { maxAllowedDays } from './max-allowed-days';
import { waitingPeriods } from './waiting-periods';
import { createId } from '@paralleldrive/cuid2';

export const jobs = sqliteTable(
  'jobs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    gitLabJobId: text('git_lab_job_id')
      .$default(() => '')
      .notNull(),
    startDate: text('start_date').notNull(),
    endDate: text('end_date').notNull(),
    ...timestamps,
  },
  (table) => {
    return {
      gitLabIndex: unique().on(table.gitLabJobId),
    };
  }
);

export const jobRelations = relations(jobs, ({ many }) => ({
  maxAllowedDays: many(maxAllowedDays, {
    relationName: 'jobMAD',
  }),
  waitingPeriods: many(waitingPeriods, {
    relationName: 'jobWP',
  }),
}));

export type SelectJob = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;
