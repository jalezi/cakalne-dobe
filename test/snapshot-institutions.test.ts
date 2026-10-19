import { describe, expect, it, vi } from 'vitest';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import { getInstitutionsToInsert } from '../seed/seed-helpers/seed-institutions';
import { prepareSnapshotInsertPayload } from '../src/snapshot/transformer';

// seed-institutions imports @/db, which reads DATABASE_URL on import
vi.mock('@/db', () => ({ db: {} }));

// Hospital C comes first and Hospital A has four spellings, so the expected
// order is first-seen, not alphabetical. Hospital E first appears in P1's fast
// and Hospital F in P2's regular, so walking urgencies before procedures would
// put F before E.
const SNAPSHOT: AllData = {
  start: '2024-01-01',
  end: '2024-01-02',
  procedures: [
    {
      code: 'P1',
      name: ' Procedure  1 ',
      maxAllowedDays: { regular: 10, fast: 5, veryFast: 1 },
      waitingPeriods: {
        regular: [
          { facility: 'Hospital  C', days: 7 },
          { facility: ' Hospital A ', days: 5 },
        ],
        fast: [
          { facility: 'Hospital A', days: 2 },
          { facility: 'Hospital C', days: 3 },
          { facility: 'Hospital E', days: 11 },
        ],
        // Same urgency twice after trimming: the last one wins
        veryFast: [
          { facility: ' Hospital A', days: 1 },
          { facility: 'Hospital A ', days: 9 },
        ],
      },
    },
    {
      code: 'P2',
      name: 'Procedure 2',
      maxAllowedDays: { regular: 20, fast: 10, veryFast: 2 },
      waitingPeriods: {
        regular: [{ facility: 'Hospital F', days: 12 }],
        fast: [{ facility: 'Hospital B', days: 4 }],
        veryFast: [{ facility: ' Hospital A ', days: 6 }],
      },
    },
  ],
};

const SECOND_SNAPSHOT: AllData = {
  start: '2024-01-02',
  end: '2024-01-03',
  procedures: [
    {
      code: 'P1',
      name: 'Procedure 1',
      maxAllowedDays: { regular: 10, fast: 5, veryFast: 1 },
      waitingPeriods: {
        regular: [
          { facility: 'Hospital D', days: 3 },
          { facility: ' Hospital  B', days: 8 },
        ],
        fast: null,
        veryFast: null,
      },
    },
  ],
};

describe('prepareSnapshotInsertPayload', () => {
  it('merges spellings of one institution into one entry per procedure', () => {
    const result = prepareSnapshotInsertPayload(SNAPSHOT, 'gl-1');

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.procedures).toEqual([
      { code: 'P1', name: 'Procedure 1' },
      { code: 'P2', name: 'Procedure 2' },
    ]);
    expect(result.data.maxAllowedDays).toEqual([
      { regular: 10, fast: 5, veryFast: 1, jobId: 'gl-1', procedureCode: 'P1' },
      {
        regular: 20,
        fast: 10,
        veryFast: 2,
        jobId: 'gl-1',
        procedureCode: 'P2',
      },
    ]);
    expect(Array.from(result.data.institutions.entries())).toEqual([
      ['Hospital C', { name: 'Hospital C' }],
      ['Hospital A', { name: 'Hospital A' }],
      ['Hospital E', { name: 'Hospital E' }],
      ['Hospital F', { name: 'Hospital F' }],
      ['Hospital B', { name: 'Hospital B' }],
    ]);
    expect(Array.from(result.data.waitingPeriods.entries())).toEqual([
      [
        'Hospital C-P1',
        {
          regular: 7,
          fast: 3,
          veryFast: null,
          jobId: 'gl-1',
          procedureCode: 'P1',
          institutionName: 'Hospital C',
        },
      ],
      [
        'Hospital A-P1',
        {
          regular: 5,
          fast: 2,
          veryFast: 9,
          jobId: 'gl-1',
          procedureCode: 'P1',
          institutionName: 'Hospital A',
        },
      ],
      [
        'Hospital E-P1',
        {
          regular: null,
          fast: 11,
          veryFast: null,
          jobId: 'gl-1',
          procedureCode: 'P1',
          institutionName: 'Hospital E',
        },
      ],
      [
        'Hospital F-P2',
        {
          regular: 12,
          fast: null,
          veryFast: null,
          jobId: 'gl-1',
          procedureCode: 'P2',
          institutionName: 'Hospital F',
        },
      ],
      [
        'Hospital B-P2',
        {
          regular: null,
          fast: 4,
          veryFast: null,
          jobId: 'gl-1',
          procedureCode: 'P2',
          institutionName: 'Hospital B',
        },
      ],
      [
        'Hospital A-P2',
        {
          regular: null,
          fast: null,
          veryFast: 6,
          jobId: 'gl-1',
          procedureCode: 'P2',
          institutionName: 'Hospital A',
        },
      ],
    ]);
  });
});

describe('getInstitutionsToInsert', () => {
  it('returns each institution once across jobs, in first-seen order', () => {
    const institutions = getInstitutionsToInsert([SNAPSHOT, SECOND_SNAPSHOT]);

    expect(Array.from(institutions.entries())).toEqual([
      ['Hospital C', { name: 'Hospital C' }],
      ['Hospital A', { name: 'Hospital A' }],
      ['Hospital E', { name: 'Hospital E' }],
      ['Hospital F', { name: 'Hospital F' }],
      ['Hospital B', { name: 'Hospital B' }],
      ['Hospital D', { name: 'Hospital D' }],
    ]);
  });
});
