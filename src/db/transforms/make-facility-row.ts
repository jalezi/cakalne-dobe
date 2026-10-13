import type {
  FacilityProcedureWaitingTimes,
  ProcedureWithWaitingPeriod,
} from '@/lib/zod-schemas/data-schemas';

/**
 * Converts an array of procedures with waiting periods into an array of facility procedure waiting times.
 *
 * @param procedures - An array of procedures with waiting periods.
 * @returns An array of facility procedure waiting times.
 */
export function makeFacilityRows(
  procedures: ProcedureWithWaitingPeriod[]
): FacilityProcedureWaitingTimes[] {
  const map = new Map<string, FacilityProcedureWaitingTimes>();

  for (const { code, name, waitingPeriods } of procedures) {
    const urgencies = Object.keys(waitingPeriods) as Array<
      keyof typeof waitingPeriods
    >;

    for (const urgency of urgencies) {
      const waitingPeriod = waitingPeriods[urgency];
      if (!waitingPeriod) continue;

      for (const { facility, days } of waitingPeriod) {
        const key = `${facility}|${code}`;
        let row = map.get(key);
        if (!row) {
          row = {
            facility,
            procedure: { code, name },
            waitingPeriods: { regular: null, fast: null, veryFast: null },
          };
          map.set(key, row);
        }
        row.waitingPeriods[urgency] = days;
      }
    }
  }

  return Array.from(map.values());
}
