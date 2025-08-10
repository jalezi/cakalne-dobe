import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getJsonPath, getJson } from './get-json';
import { allDataSchema } from '@/lib/zod-schemas/data-schemas';

// Mock global fetch
vi.stubGlobal('fetch', vi.fn());

describe('getJsonPath', () => {
  it('should generate the correct URL path for a job ID', () => {
    const id = '12345';
    const expectedPath =
      'https://wayback-automachine.gitlab.io/-/cakalne-dobe/-/jobs/12345/artifacts/out.json';
    expect(getJsonPath(id)).toBe(expectedPath);
  });
});

describe('getJson', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Mock console.error to avoid cluttering test output
    console.error = vi.fn();
  });

  it('should fetch and parse JSON data successfully', async () => {
    // Mock data that matches the schema
    const mockData = {
      start: '2023-01-01',
      end: '2023-01-02',
      procedures: [
        {
          code: 'P1',
          name: 'Procedure 1',
          maxAllowedDays: {
            regular: 10,
            fast: 5,
            veryFast: 1,
          },
          waitingPeriods: {
            regular: [{ facility: 'Facility A', days: 5 }],
            fast: [{ facility: 'Facility A', days: 2 }],
            veryFast: [{ facility: 'Facility A', days: 1 }],
          },
        },
      ],
    };

    // Verify the mock data is valid according to our schema
    const parsedData = allDataSchema.safeParse(mockData);
    expect(parsedData.success).toBe(true);

    // Mock fetch response
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await getJson('12345');

    // Verify fetch was called with correct URL
    expect(fetch).toHaveBeenCalledWith(
      'https://wayback-automachine.gitlab.io/-/cakalne-dobe/-/jobs/12345/artifacts/out.json',
      expect.objectContaining({
        next: { tags: ['getJson'] },
        cache: 'no-store',
      })
    );

    // Verify result
    expect(result).toEqual(mockData);
  });

  it('should throw an error when fetch fails', async () => {
    // Mock a failed fetch
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
    });

    // Test the catch-all error handling
    try {
      await getJson('12345');
      // If we get here, fail the test
      expect(true).toBe(false);
    } catch (error: unknown) {
      // The function wraps all errors as "Unknown error"
      expect((error as Error).message).toBe('Unknown error');
    }
  });

  it('should throw an error if data validation fails', async () => {
    // Mock invalid data that doesn't match the schema
    const mockInvalidData = {
      // Missing required fields
      procedures: [{ name: 'Invalid Procedure' }],
    };

    // Mock fetch response
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockInvalidData),
    });

    // Test using try/catch to verify the error message
    try {
      await getJson('12345');
      // If we get here, fail the test
      expect(true).toBe(false);
    } catch (error: unknown) {
      // The function wraps all errors as "Unknown error"
      expect((error as Error).message).toBe('Unknown error');
    }
  });
});
