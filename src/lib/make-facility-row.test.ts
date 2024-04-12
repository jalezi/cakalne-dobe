import { expect, describe, it, test } from 'vitest';

import { makeFacilityRows } from './make-facility-row';
import {
  type MayAllowedDaysByUrgency,
  type ProcedureWithWaitingPeriod,
} from './zod-schemas/data-schemas';

const MAX_ALLOWED_DAYS: Record<string, MayAllowedDaysByUrgency> = {
  A: {
    regular: 10,
    fast: 5,
    veryFast: 1,
  },
  B: {
    regular: 15,
    fast: 10,
    veryFast: 5,
  },
};

const PROCEDURES = {
  P1: {
    code: 'P1',
    name: 'Procedure P1',
  },
  P2: {
    code: 'P2',
    name: 'Procedure P2',
  },
} as const;

const FACILITY = {
  A: 'Facility A',
  B: 'Facility B',
} as const;

describe('makeFacilityRows', () => {
  it('should return an empty array if no procedures are provided', () => {
    const procedures: ProcedureWithWaitingPeriod[] = [];
    const result = makeFacilityRows(procedures);
    expect(result).toEqual([]);
  });

  describe('should correctly group procedures by facility and code', () => {
    test('facility has all waiting periods', () => {
      const procedures: ProcedureWithWaitingPeriod[] = [
        {
          ...PROCEDURES.P1,
          maxAllowedDays: MAX_ALLOWED_DAYS.A,
          waitingPeriods: {
            regular: [{ facility: FACILITY.A, days: 5 }],
            fast: [{ facility: FACILITY.A, days: 2 }],
            veryFast: [{ facility: FACILITY.A, days: 1 }],
          },
        },
      ];

      const result = makeFacilityRows(procedures);

      expect(result).toEqual([
        {
          facility: FACILITY.A,
          procedure: PROCEDURES.P1,
          waitingPeriods: {
            regular: 5,
            fast: 2,
            veryFast: 1,
          },
        },
      ]);
    });

    test('facility has all waiting periods as 0 (zero)', () => {
      const procedures: ProcedureWithWaitingPeriod[] = [
        {
          ...PROCEDURES.P1,
          maxAllowedDays: MAX_ALLOWED_DAYS.A,
          waitingPeriods: {
            regular: [{ facility: FACILITY.A, days: 0 }],
            fast: [{ facility: FACILITY.A, days: 0 }],
            veryFast: [{ facility: FACILITY.A, days: 0 }],
          },
        },
      ];

      const result = makeFacilityRows(procedures);

      expect(result).toEqual([
        {
          facility: FACILITY.A,
          procedure: PROCEDURES.P1,
          waitingPeriods: {
            regular: 0,
            fast: 0,
            veryFast: 0,
          },
        },
      ]);
    });

    test('one facility has some waiting periods', () => {
      const procedures: ProcedureWithWaitingPeriod[] = [
        {
          ...PROCEDURES.P1,
          maxAllowedDays: MAX_ALLOWED_DAYS.A,
          waitingPeriods: {
            regular: [{ facility: FACILITY.A, days: 5 }],
            fast: [],
            veryFast: [],
          },
        },
      ];

      const result = makeFacilityRows(procedures);

      expect(result).toEqual([
        {
          facility: FACILITY.A,
          procedure: PROCEDURES.P1,
          waitingPeriods: {
            regular: 5,
            fast: null,
            veryFast: null,
          },
        },
      ]);
    });

    test('one facility has for one procedure, another facility for another procedure ', () => {
      const procedures: ProcedureWithWaitingPeriod[] = [
        {
          ...PROCEDURES.P1,
          maxAllowedDays: MAX_ALLOWED_DAYS.A,
          waitingPeriods: {
            regular: [{ facility: FACILITY.A, days: 5 }],
            fast: [{ facility: FACILITY.A, days: 2 }],
            veryFast: [{ facility: FACILITY.A, days: 1 }],
          },
        },
        {
          ...PROCEDURES.P2,
          maxAllowedDays: MAX_ALLOWED_DAYS.P2,
          waitingPeriods: {
            regular: [{ facility: FACILITY.B, days: 5 }],
            fast: [{ facility: FACILITY.B, days: 2 }],
            veryFast: [{ facility: FACILITY.B, days: 1 }],
          },
        },
      ];

      const result = makeFacilityRows(procedures);

      expect(result).toEqual([
        {
          facility: FACILITY.A,
          procedure: PROCEDURES.P1,
          waitingPeriods: {
            regular: 5,
            fast: 2,
            veryFast: 1,
          },
        },
        {
          facility: FACILITY.B,
          procedure: PROCEDURES.P2,
          waitingPeriods: {
            regular: 5,
            fast: 2,
            veryFast: 1,
          },
        },
      ]);
    });

    test('one facility has all procedures waiting periods, one just for one procedure', () => {
      const procedures: ProcedureWithWaitingPeriod[] = [
        {
          ...PROCEDURES.P1,
          maxAllowedDays: MAX_ALLOWED_DAYS.A,
          waitingPeriods: {
            regular: [
              { facility: FACILITY.A, days: 5 },
              { facility: FACILITY.B, days: 10 },
            ],
            fast: [
              { facility: FACILITY.A, days: 2 },
              { facility: FACILITY.B, days: 5 },
            ],
            veryFast: [
              { facility: FACILITY.A, days: 1 },
              { facility: FACILITY.B, days: 2 },
            ],
          },
        },
        {
          ...PROCEDURES.P2,
          maxAllowedDays: MAX_ALLOWED_DAYS.B,
          waitingPeriods: {
            regular: [{ facility: FACILITY.A, days: 2 }],
            fast: [{ facility: FACILITY.A, days: 2 }],
            veryFast: [{ facility: FACILITY.A, days: 2 }],
          },
        },
      ];

      const result = makeFacilityRows(procedures);

      expect(result).toEqual([
        {
          facility: FACILITY.A,
          procedure: PROCEDURES.P1,
          waitingPeriods: {
            regular: 5,
            fast: 2,
            veryFast: 1,
          },
        },
        {
          facility: FACILITY.B,
          procedure: PROCEDURES.P1,
          waitingPeriods: {
            regular: 10,
            fast: 5,
            veryFast: 2,
          },
        },
        {
          facility: FACILITY.A,
          procedure: PROCEDURES.P2,
          waitingPeriods: {
            regular: 2,
            fast: 2,
            veryFast: 2,
          },
        },
      ]);
    });
  });
});
