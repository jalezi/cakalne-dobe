import { describe, expect, it } from 'vitest';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import { prepareSnapshotInsertPayload } from '../src/snapshot/transformer';

const VALID_SNAPSHOT: AllData = {
  start: '2024-01-01',
  end: '2024-01-02',
  procedures: [
    {
      code: 'P1',
      name: 'Procedure 1',
      maxAllowedDays: { regular: 10, fast: 5, veryFast: 1 },
      waitingPeriods: {
        regular: [{ facility: 'Hospital A', days: 5 }],
        fast: [{ facility: 'Hospital A', days: 2 }],
        veryFast: null,
      },
    },
  ],
};

describe('prepareSnapshotInsertPayload', () => {
  it('returns transformed payload for valid snapshot', () => {
    const result = prepareSnapshotInsertPayload(VALID_SNAPSHOT, 'gl-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.procedures).toHaveLength(1);
      expect(result.data.institutions.size).toBe(1);
      expect(result.data.maxAllowedDays).toHaveLength(1);
      expect(result.data.waitingPeriods.size).toBe(1);
    }
  });

  it('returns TRANSFORM_FAILED when transformation throws', () => {
    const badSnapshot = {
      ...VALID_SNAPSHOT,
      procedures: [
        {
          ...VALID_SNAPSHOT.procedures[0],
          waitingPeriods: {
            regular: [{ facility: 123, days: 5 }],
            fast: null,
            veryFast: null,
          },
        },
      ],
    } as unknown as AllData;

    const result = prepareSnapshotInsertPayload(badSnapshot, 'gl-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.details?.code).toBe('TRANSFORM_FAILED');
    }
  });
});
