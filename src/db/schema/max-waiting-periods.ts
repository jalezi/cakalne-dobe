import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { timestamps } from '../schema-common-fields';
import { jobs } from './jobs';
import { procedures } from './procedures';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

export const maxWaitingPeriods = sqliteTable('max_waiting_periods', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  maxRegularWaitingPeriod: integer('max_regular_waiting_period').notNull(),
  maxFastWaitingPeriod: integer('max_fast_waiting_period').notNull(),
  maxVeryFastWaitingPeriod: integer('max_very_fast_waiting_period').notNull(),
  jobId: text('job_id')
    .notNull()
    .references(() => jobs.id),
  procedureId: text('procedure_id')
    .notNull()
    .references(() => procedures.id),
  ...timestamps,
});

export const maxWaitingPeriodsRelations = relations(
  maxWaitingPeriods,
  ({ one }) => ({
    job: one(jobs, {
      fields: [maxWaitingPeriods.jobId],
      references: [jobs.id],
      relationName: 'jobMWP',
    }),
    procedure: one(procedures, {
      fields: [maxWaitingPeriods.procedureId],
      references: [procedures.id],
      relationName: 'procedureMWP',
    }),
  })
);
