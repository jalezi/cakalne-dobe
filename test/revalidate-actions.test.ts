import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Next.js cache functions
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

// Import after mocking
import {
  revalidateGetJson,
  revalidatePathId,
} from '../src/actions/revalidate-tag';
import { revalidateTag, revalidatePath } from 'next/cache';

describe('Revalidate Actions', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should call revalidateTag with "getJson"', async () => {
    // Call the action
    await revalidateGetJson();

    // Verify the mock was called with the correct parameter
    expect(revalidateTag).toHaveBeenCalledWith('getJson');
    expect(revalidateTag).toHaveBeenCalledTimes(1);
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
    expect(revalidateTag).toHaveBeenCalledTimes(0);
    expect(revalidatePath).toHaveBeenCalledTimes(0);
  });
});
