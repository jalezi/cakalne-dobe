import { describe, it, expect } from 'vitest';
import { makeProcedureMaxAllowedWaiting } from './make-procedure-max-allowed-waiting';
import type { ProcedureWithWaitingPeriod } from './zod-schemas/data-schemas';

describe('makeProcedureMaxAllowedWaiting', () => {
    it('should extract code, name, and maxAllowedDays from procedures', () => {
        // Create test data
        const procedures: ProcedureWithWaitingPeriod[] = [
            {
                code: 'P1',
                name: 'Procedure 1',
                maxAllowedDays: {
                    regular: 10,
                    fast: 5,
                    veryFast: 1
                },
                waitingPeriods: {
                    regular: [{ facility: 'Facility A', days: 5 }],
                    fast: [{ facility: 'Facility A', days: 2 }],
                    veryFast: [{ facility: 'Facility A', days: 1 }]
                }
            },
            {
                code: 'P2',
                name: 'Procedure 2',
                maxAllowedDays: {
                    regular: 15,
                    fast: 10,
                    veryFast: 5
                },
                waitingPeriods: {
                    regular: [{ facility: 'Facility B', days: 10 }],
                    fast: [{ facility: 'Facility B', days: 8 }],
                    veryFast: [{ facility: 'Facility B', days: 3 }]
                }
            }
        ];

        // Execute the function
        const result = makeProcedureMaxAllowedWaiting(procedures);

        // Verify results
        expect(result).toEqual([
            {
                code: 'P1',
                name: 'Procedure 1',
                maxAllowedDays: {
                    regular: 10,
                    fast: 5,
                    veryFast: 1
                }
            },
            {
                code: 'P2',
                name: 'Procedure 2',
                maxAllowedDays: {
                    regular: 15,
                    fast: 10,
                    veryFast: 5
                }
            }
        ]);
    });

    it('should return an empty array when no procedures are provided', () => {
        const result = makeProcedureMaxAllowedWaiting([]);
        expect(result).toEqual([]);
    });
});
