import type {
  ProcedureWithMaxAllowedDays,
  ProcedureWithWaitingPeriod,
} from '@/lib/zod-schemas/data-schemas';

export function makeProcedureMaxAllowedWaiting(
  procedures: ProcedureWithWaitingPeriod[]
): ProcedureWithMaxAllowedDays[] {
  return procedures.map((procedure) => {
    return {
      code: procedure.code,
      name: procedure.name,
      maxAllowedDays: procedure.maxAllowedDays,
    };
  });
}
