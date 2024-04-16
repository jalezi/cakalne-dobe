import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { timestamps } from '../schema-common-fields';
import { relations } from 'drizzle-orm';
import { maxWaitingPeriods } from './max-waiting-periods';
import { waitingPeriods } from './waiting-periods';

export const jobs = sqliteTable('jobs', {
  jobId: text('job_id').primaryKey(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  ...timestamps,
});

export const jobRelations = relations(jobs, ({ many }) => ({
  maxWaitingPeriods: many(maxWaitingPeriods, {
    relationName: 'jobMWP',
  }),
  waitingPeriods: many(waitingPeriods, {
    relationName: 'jobWP',
  }),
}));
