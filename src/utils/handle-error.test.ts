import { describe, it, expect } from 'vitest';
import { handleError } from './handle-error';

describe('handleError', () => {
  it('should return the original error if it is an Error instance', () => {
    const originalError = new Error('Test error');
    const result = handleError(originalError);

    expect(result).toBe(originalError);
    expect(result.message).toBe('Test error');
  });

  it('should create a new error with toString() result if available', () => {
    const customError = {
      toString: () => 'Custom error message',
    };

    const result = handleError(customError);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('Custom error message');
  });

  it('should create a generic error message for undefined or null', () => {
    const resultUndefined = handleError(undefined);
    expect(resultUndefined).toBeInstanceOf(Error);
    expect(resultUndefined.message).toBe('Unknown error');

    const resultNull = handleError(null);
    expect(resultNull).toBeInstanceOf(Error);
    expect(resultNull.message).toBe('Unknown error');
  });

  it('should create a new error for primitive values', () => {
    const stringResult = handleError('String error');
    expect(stringResult).toBeInstanceOf(Error);
    expect(stringResult.message).toBe('String error');

    const numberResult = handleError(42);
    expect(numberResult).toBeInstanceOf(Error);
    expect(numberResult.message).toBe('42');

    const booleanResult = handleError(true);
    expect(booleanResult).toBeInstanceOf(Error);
    expect(booleanResult.message).toBe('true');
  });
});
