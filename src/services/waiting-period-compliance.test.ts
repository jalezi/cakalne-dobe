import { describe, expect, it } from 'vitest';
import {
  getWaitingPeriodCompliance,
  isAnyExceeded,
} from './waiting-period-compliance';

describe('getWaitingPeriodCompliance', () => {
  it('returns compliant for all urgency levels when waiting period is within limits', () => {
    const result = getWaitingPeriodCompliance(
      {
        regular: 10,
        fast: 5,
        veryFast: 1,
      },
      {
        regular: 10,
        fast: 6,
        veryFast: 2,
      }
    );

    expect(result).toEqual({
      regular: 'compliant',
      fast: 'compliant',
      veryFast: 'compliant',
    });
  });

  it('returns exceeded only for urgency levels that are over the limit', () => {
    const result = getWaitingPeriodCompliance(
      {
        regular: 12,
        fast: 4,
        veryFast: 1,
      },
      {
        regular: 10,
        fast: 4,
        veryFast: 2,
      }
    );

    expect(result).toEqual({
      regular: 'exceeded',
      fast: 'compliant',
      veryFast: 'compliant',
    });
  });

  it('returns exceeded for all urgency levels when all are above limits', () => {
    const result = getWaitingPeriodCompliance(
      {
        regular: 11,
        fast: 6,
        veryFast: 3,
      },
      {
        regular: 10,
        fast: 5,
        veryFast: 2,
      }
    );

    expect(result).toEqual({
      regular: 'exceeded',
      fast: 'exceeded',
      veryFast: 'exceeded',
    });
  });

  it('returns unknown for urgency levels where max allowed days are null', () => {
    const result = getWaitingPeriodCompliance(
      {
        regular: 8,
        fast: 3,
        veryFast: 1,
      },
      {
        regular: 10,
        fast: null,
        veryFast: 2,
      }
    );

    expect(result).toEqual({
      regular: 'compliant',
      fast: 'unknown',
      veryFast: 'compliant',
    });
  });

  it('returns unknown for urgency levels where waiting days are null', () => {
    const result = getWaitingPeriodCompliance(
      {
        regular: null,
        fast: 3,
        veryFast: 1,
      },
      {
        regular: 10,
        fast: 4,
        veryFast: 2,
      }
    );

    expect(result).toEqual({
      regular: 'unknown',
      fast: 'compliant',
      veryFast: 'compliant',
    });
  });

  it('reports if any urgency level is exceeded', () => {
    const exceeded = isAnyExceeded({
      regular: 'compliant',
      fast: 'exceeded',
      veryFast: 'unknown',
    });
    const notExceeded = isAnyExceeded({
      regular: 'compliant',
      fast: 'unknown',
      veryFast: 'compliant',
    });

    expect(exceeded).toBe(true);
    expect(notExceeded).toBe(false);
  });
});
