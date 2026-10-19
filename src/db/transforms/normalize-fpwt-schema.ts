import { facilityProcedureWaitingTimesSchema } from '@/lib/zod-schemas/data-schemas';
import { normalizeInstitutionName } from './institution-name';
import { normalizeProcedureName } from './procedure-name';

export const normalizeFPWTSchema =
  facilityProcedureWaitingTimesSchema.transform((val) => {
    return {
      facility: normalizeInstitutionName(val.facility),
      procedure: {
        code: val.procedure.code,
        name: normalizeProcedureName(val.procedure.name),
      },
      waitingPeriods: {
        regular: val.waitingPeriods.regular,
        fast: val.waitingPeriods.fast,
        veryFast: val.waitingPeriods.veryFast,
      },
    };
  });
