import type {
  FacilityProcedureWaitingTimes,
  ProcedureWithWaitingPeriod,
} from './zod-schemas/data-schemas';

/**
 * Converts an array of procedures with waiting periods into an array of facility procedure waiting times.
 *
 * @param procedures - An array of procedures with waiting periods.
 * @returns An array of facility procedure waiting times.
 */
export function makeFacilityRows(
  procedures: ProcedureWithWaitingPeriod[]
): FacilityProcedureWaitingTimes[] {
  return procedures.reduce((acc, procedure) => {
    const { code, name, waitingPeriods } = procedure;
    const urgencies = Object.keys(waitingPeriods) as Array<
      keyof typeof waitingPeriods
    >;

    for (const urgency of urgencies) {
      const waitingPeriod = waitingPeriods[urgency];
      if (!waitingPeriod) continue;

      for (const { facility, days } of waitingPeriod) {
        const facilityRow = acc.find(
          (row) => row.facility === facility && row.procedure.code === code
        );
        if (!facilityRow) {
          acc.push({
            facility,
            procedure: {
              code,
              name,
            },
            waitingPeriods: {
              regular: null,
              fast: null,
              veryFast: null,
            },
          });
        }

        const row = acc.find(
          (row) => row.facility === facility && row.procedure.code === code
        );
        if (!row) continue;

        row.waitingPeriods[urgency] = days;
      }
    }

    return acc;
  }, [] as FacilityProcedureWaitingTimes[]);
}
