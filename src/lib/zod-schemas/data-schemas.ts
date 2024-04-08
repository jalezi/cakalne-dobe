import { z } from "zod";

export const waitingPeriodSchema = z.object({
  facility: z.string(),
  days: z.number().min(0),
});

export type WaitingPeriod = z.infer<typeof waitingPeriodSchema>;

export const waitingPeriodsByUrgencySchema = z.object({
  regular: z.array(waitingPeriodSchema),
  fast: z.array(waitingPeriodSchema),
  veryFast: z.array(waitingPeriodSchema),
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

export const procedureWithWaitingPeriodSchema = z.object({
  code: z.string(),
  name: z.string(),
  maxAllowedDays: maxAllowedDaysByUrgencySchema,
  waitingPeriods: waitingPeriodsByUrgencySchema,
});

export type ProcedureWithWaitingPeriod = z.infer<
  typeof procedureWithWaitingPeriodSchema
>;

export const allDataSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  procedures: z.array(procedureWithWaitingPeriodSchema),
});

export type AllData = z.infer<typeof allDataSchema>;
