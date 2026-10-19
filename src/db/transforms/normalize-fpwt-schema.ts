import { facilityProcedureWaitingTimesSchema } from '@/lib/zod-schemas/data-schemas';
import { trimStringWithDashes } from '@/lib/zod-schemas/helpers-schema';
import { normalizeInstitutionName } from './institution-name';

export const normalizeFPWTSchema =
  facilityProcedureWaitingTimesSchema.transform((val) => {
    return {
      facility: normalizeInstitutionName(val.facility),
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
