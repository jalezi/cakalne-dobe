import { z } from 'zod';

export const waitingPeriodSchema = z.object({
  facility: z.string(),
  days: z.number().min(0),
});

export type WaitingPeriod = z.infer<typeof waitingPeriodSchema>;

export const waitingPeriodsByUrgencySchema = z.object({
  regular: z.array(waitingPeriodSchema).nullable(),
  fast: z.array(waitingPeriodSchema).nullable(),
  veryFast: z.array(waitingPeriodSchema).nullable(),
});

export type WaitingPeriodsByUrgency = z.infer<
  typeof waitingPeriodsByUrgencySchema
>;

export const maxAllowedDaysByUrgencySchema = z.object({
  regular: z.number().min(0),
  fast: z.number().min(0),
  veryFast: z.number().min(0),
});

export type MayAllowedDaysByUrgency = z.infer<
  typeof maxAllowedDaysByUrgencySchema
>;

export const procedureWithMaxAllowedDaysSchema = z.object({
  code: z.string(),
  name: z.string(),
  maxAllowedDays: maxAllowedDaysByUrgencySchema,
});

export type ProcedureWithMaxAllowedDays = z.infer<
  typeof procedureWithMaxAllowedDaysSchema
>;

export const procedureWithWaitingPeriodSchema =
  procedureWithMaxAllowedDaysSchema.extend({
    waitingPeriods: waitingPeriodsByUrgencySchema,
  });

export type ProcedureWithWaitingPeriod = z.infer<
  typeof procedureWithWaitingPeriodSchema
>;

export const allDataSchema = z.object({
  start: z.string(),
  end: z.string(),
  procedures: z.array(procedureWithWaitingPeriodSchema),
});

export type AllData = z.infer<typeof allDataSchema>;

export const facilityProcedureWaitingTimesSchema = z.object({
  procedure: z.object({
    code: z.string(),
    name: z.string(),
  }),
  facility: z.string(),
  waitingPeriods: z.object({
    regular: z.number().nullable(),
    fast: z.number().nullable(),
    veryFast: z.number().nullable(),
  }),
});

export type FacilityProcedureWaitingTimes = z.infer<
  typeof facilityProcedureWaitingTimesSchema
>;
