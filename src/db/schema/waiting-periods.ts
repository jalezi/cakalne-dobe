import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';
import { jobs } from './jobs';
import { institutions } from './institution';
import { procedures } from './procedures';
import { timestamps } from '../schema-common-fields';
import { relations } from 'drizzle-orm';

export const waitingPeriods = sqliteTable(
  'waiting_periods',
  {
    regular: integer('regular'),
    fast: integer('fast'),
    veryFast: integer('very_fast'),
    jobId: text('job_id')
      .notNull()
      .references(() => jobs.id),
    institutionId: text('institution_id')
      .notNull()
      .references(() => institutions.id),
    procedureId: text('procedure_id')
      .notNull()
      .references(() => procedures.id),
    ...timestamps,
  },
  (table) => {
    return {
      pk: primaryKey({
        columns: [table.jobId, table.institutionId, table.procedureId],
      }),
    };
  }
);

export const waitingPeriodsRelations = relations(waitingPeriods, ({ one }) => ({
  job: one(jobs, {
    fields: [waitingPeriods.jobId],
    references: [jobs.id],
    relationName: 'jobWP',
  }),
  institution: one(institutions, {
    fields: [waitingPeriods.institutionId],
    references: [institutions.id],
    relationName: 'institutionWP',
  }),
  procedure: one(procedures, {
    fields: [waitingPeriods.procedureId],
    references: [procedures.id],
    relationName: 'procedureWP',
  }),
}));
