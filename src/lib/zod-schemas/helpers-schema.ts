import { z } from 'zod';
import { facilityProcedureWaitingTimesSchema } from './data-schemas';

export const trimmedStringSchema = z
  .string()
  .transform((s) => s.replace(/\s+/g, ' ').trim());

export const trimStringWithDashes = z.string().transform((s) =>
  s
    .split('-')
    .map((w) => trimmedStringSchema.parse(w))
    .join('-')
);

export const normalizeFPWTSchema =
  facilityProcedureWaitingTimesSchema.transform((val) => {
    return {
      facility: trimmedStringSchema.parse(val.facility),
      procedure: {
        code: val.procedure.code,
        name: trimStringWithDashes.parse(val.procedure.name),
      },
      waitingPeriods: {
        regular: val.waitingPeriods.regular,
        fast: val.waitingPeriods.fast,
        veryFast: val.waitingPeriods.veryFast,
      },
    };
  });
