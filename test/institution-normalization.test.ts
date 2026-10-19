import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import {
  getSnapshotInstitutionNames,
  normalizeInstitutionName,
  snapshotInsertPayloadKey,
} from '../src/db/transforms/institution-name';

describe('normalizeInstitutionName', () => {
  it.each([
    { input: ' Hospital A ', expected: 'Hospital A' },
    { input: '\tHospital A\n', expected: 'Hospital A' },
    { input: 'Hospital  \t A', expected: 'Hospital A' },
    { input: 'Hospital A', expected: 'Hospital A' },
  ])('normalizes $input to $expected', ({ input, expected }) => {
    expect(normalizeInstitutionName(input)).toBe(expected);
  });

  it.each([123, null, undefined])('throws a ZodError for %s', (input) => {
    expect(() => normalizeInstitutionName(input)).toThrow(ZodError);
  });
});

describe('snapshotInsertPayloadKey', () => {
  it('joins the normalized name and the procedure code', () => {
    expect(snapshotInsertPayloadKey(' Hospital  A ', 'P1')).toBe(
      'Hospital A-P1'
    );
  });

  it('gives every spelling of one institution the same key', () => {
    expect(snapshotInsertPayloadKey(' Hospital A', 'P1')).toBe(
      snapshotInsertPayloadKey('Hospital A', 'P1')
    );
  });
});

describe('getSnapshotInstitutionNames', () => {
  const snapshot = (procedures: AllData['procedures']): AllData => ({
    start: '2024-01-01',
    end: '2024-01-02',
    procedures,
  });
  const maxAllowedDays = { regular: 10, fast: 5, veryFast: 1 };

  it('returns each name once, in the order it first appears', () => {
    const names = getSnapshotInstitutionNames(
      snapshot([
        {
          code: 'P1',
          name: 'Procedure 1',
          maxAllowedDays,
          waitingPeriods: {
            regular: [
              { facility: 'Hospital B', days: 1 },
              { facility: ' Hospital A ', days: 2 },
            ],
            fast: null,
            veryFast: [{ facility: 'Hospital  B', days: 3 }],
          },
        },
        {
          code: 'P2',
          name: 'Procedure 2',
          maxAllowedDays,
          waitingPeriods: {
            regular: null,
            fast: [
              { facility: 'Hospital A', days: 4 },
              { facility: 'Hospital C', days: 5 },
            ],
            veryFast: null,
          },
        },
      ])
    );

    expect(Array.from(names)).toEqual([
      'Hospital B',
      'Hospital A',
      'Hospital C',
    ]);
  });

  it('returns no names for a Snapshot without procedures', () => {
    expect(getSnapshotInstitutionNames(snapshot([])).size).toBe(0);
  });

  it('throws a ZodError for a facility that is not a string', () => {
    const procedures = [
      {
        code: 'P1',
        name: 'Procedure 1',
        maxAllowedDays,
        waitingPeriods: {
          regular: [{ facility: 123, days: 1 }],
          fast: null,
          veryFast: null,
        },
      },
    ] as unknown as AllData['procedures'];

    expect(() => getSnapshotInstitutionNames(snapshot(procedures))).toThrow(
      ZodError
    );
  });
});
