import { relations } from 'drizzle-orm';
import { institutions } from './institution';
import { jobs } from './jobs';
import { maxAllowedDays } from './max-allowed-days';
import { procedures } from './procedures';
import { waitingPeriods } from './waiting-periods';

export const institutionsRelations = relations(institutions, ({ many }) => ({
  waitingPeriodSchema: many(waitingPeriods, {
    relationName: 'institutionWP',
  }),
}));

export const jobRelations = relations(jobs, ({ many }) => ({
  maxAllowedDays: many(maxAllowedDays, {
    relationName: 'jobMAD',
  }),
  waitingPeriods: many(waitingPeriods, {
    relationName: 'jobWP',
  }),
}));

export const maxAllowedDaysRelations = relations(maxAllowedDays, ({ one }) => ({
  job: one(jobs, {
    fields: [maxAllowedDays.jobId],
    references: [jobs.id],
    relationName: 'jobMAD',
  }),
  procedure: one(procedures, {
    fields: [maxAllowedDays.procedureId],
    references: [procedures.id],
    relationName: 'procedureMAD',
  }),
}));

export const proceduresRelations = relations(procedures, ({ many }) => ({
  maxAllowedDays: many(maxAllowedDays, {
    relationName: 'procedureMAD',
  }),
  waitingPeriods: many(waitingPeriods, {
    relationName: 'procedureWP',
  }),
}));

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
