import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { normalizeProcedureName } from '../src/db/transforms/procedure-name';

describe('normalizeProcedureName', () => {
  it.each([
    { input: ' Pregled - prvi ', expected: 'Pregled - prvi' },
    { input: 'Pregled  -  prvi', expected: 'Pregled - prvi' },
    { input: '\tPregled\n-\tprvi\n', expected: 'Pregled - prvi' },
    { input: 'Pregled - prvi', expected: 'Pregled - prvi' },
    { input: 'Pregled-prvi', expected: 'Pregled-prvi' },
    { input: 'mišično-skeletnega', expected: 'mišično-skeletnega' },
  ])('normalizes $input to $expected', ({ input, expected }) => {
    expect(normalizeProcedureName(input)).toBe(expected);
  });

  it.each([123, null, undefined])('throws a ZodError for %s', (input) => {
    expect(() => normalizeProcedureName(input)).toThrow(ZodError);
  });
});
