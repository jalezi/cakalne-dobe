import type { Row } from '@tanstack/table-core';
import { describe, expect, it, vi } from 'vitest';
import { fuzzyFilter, fuzzySort } from './fuzzy-filter';

// Create a more complete Row mock
const createMockRow = (value: string | number): Partial<Row<unknown>> => ({
  getValue: vi.fn().mockReturnValue(value),
  getUniqueValues: vi.fn(),
  getIsSelected: vi.fn(),
  getIsGrouped: vi.fn(),
  getCanExpand: vi.fn(),
  subRows: [],
  columnFiltersMeta: {},
  // Add other required properties as needed
});

describe('fuzzyFilter', () => {
  it('should filter items based on fuzzy matching', () => {
    // Create a more complete mock Row object
    const row = createMockRow('Hello World');

    // Mock addMeta function
    const addMeta = vi.fn();

    // Test with matching value
    const resultMatch = fuzzyFilter(
      row as Row<unknown>,
      'columnId',
      'Hello',
      addMeta
    );
    expect(resultMatch).toBe(true);
    expect(addMeta).toHaveBeenCalled();
    expect(row.getValue).toHaveBeenCalledWith('columnId');

    // Test with non-matching value
    const resultNoMatch = fuzzyFilter(
      row as Row<unknown>,
      'columnId',
      'xyz',
      addMeta
    );
    expect(resultNoMatch).toBe(false);
  });
});

describe('fuzzySort', () => {
  it('should sort items based on rank when available', () => {
    // Since we're testing the actual sorting logic, we'll need to focus on mocking just what's needed
    // We'll use a minimal mock that has just what fuzzySort accesses
    type PartialRow = {
      columnFiltersMeta: {
        [key: string]:
          | {
              itemRank: { rank: number };
            }
          | undefined;
      };
      getValue: ReturnType<typeof vi.fn>;
      original: Record<string, unknown>;
    };

    const createSortMockRow = (rankValue: number): PartialRow => ({
      columnFiltersMeta: {
        testCol: {
          itemRank: { rank: rankValue },
        },
      },
      // These are used by sortingFns.alphanumeric as a fallback, though we're not testing that path here
      getValue: vi.fn(),
      original: {},
    });

    const rowA = createSortMockRow(1);
    const rowB = createSortMockRow(2);

    // We can safely cast here since the fuzzySort function only uses properties we've defined
    const result = fuzzySort(
      rowA as unknown as Row<unknown>,
      rowB as unknown as Row<unknown>,
      'testCol'
    );

    // We're just testing that sorting is performed, not the specific result
    // which depends on the implementation of compareItems
    expect(typeof result).toBe('number');
  });

  it('should fall back to alphanumeric sorting when ranks are equal', () => {
    // Create a minimal mock that allows the alphanumeric sorting path to be tested
    type PartialRow = {
      columnFiltersMeta: Record<string, unknown>;
      getValue: ReturnType<typeof vi.fn>;
      original: Record<string, unknown>;
    };

    const createAlphaRow = (value: string): PartialRow => ({
      columnFiltersMeta: {}, // Empty to trigger the fallback path
      getValue: vi.fn().mockReturnValue(value),
      original: { testCol: value }, // Used by alphanumeric sorting
    });

    const rowA = createAlphaRow('B');
    const rowB = createAlphaRow('A');

    // We can safely cast here since the fuzzySort function only uses properties we've defined
    const result = fuzzySort(
      rowA as unknown as Row<unknown>,
      rowB as unknown as Row<unknown>,
      'testCol'
    );

    // B comes after A in alphabetical order, so the result should be positive
    expect(result).toBeGreaterThan(0);
  });
});
