import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Next.js cache functions
vi.mock('next/cache', () => ({
  updateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

import { revalidatePath, updateTag } from 'next/cache';
// Import after mocking
import {
  revalidateGetJson,
  revalidatePathId,
} from '../src/actions/revalidate-tag';

describe('Revalidate Actions', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should call updateTag with "getJson"', async () => {
    // Call the action
    await revalidateGetJson();

    // Verify the mock was called with the correct parameter
    expect(updateTag).toHaveBeenCalledWith('getJson');
    expect(updateTag).toHaveBeenCalledTimes(1);
  });

  it('should call revalidatePath with "/[id]" and "page"', async () => {
    // Call the action
    await revalidatePathId();

    // Verify the mock was called with the correct parameters
    expect(revalidatePath).toHaveBeenCalledWith('/[id]', 'page');
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  it('should have mocks reset between tests', async () => {
    // This test demonstrates that beforeEach successfully resets mocks between tests
    expect(updateTag).toHaveBeenCalledTimes(0);
    expect(revalidatePath).toHaveBeenCalledTimes(0);
  });
});
