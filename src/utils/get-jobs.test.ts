import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as gqlModule from '@/lib/gql';
import { getJobs } from './get-jobs';

// Define mock types
type MockFunction = ReturnType<typeof vi.fn>;

// Mock the GraphQL client
vi.mock('@/lib/gql', () => {
  return {
    graphQLClient: {
      setHeader: vi.fn(),
      request: vi.fn(),
    },
    projectJobsQuery: 'mocked-query',
    requiredVars: {
      fullPath: 'wayback-automachine/cakalne-dobe',
      statuses: ['SUCCESS'],
    },
  };
});

describe('getJobs', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch jobs with default options when no options are provided', async () => {
    // Mock successful response
    const mockResponse = {
      project: {
        jobs: {
          pageInfo: {
            endCursor: 'end-cursor',
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: 'start-cursor',
          },
          count: 2,
          nodes: [
            {
              name: 'run',
              finishedAt: '2023-01-01T12:00:00Z',
              detailedStatus: {
                detailsPath: '/path/to/job/1',
              },
            },
            {
              name: 'run',
              finishedAt: '2023-01-02T12:00:00Z',
              detailedStatus: {
                detailsPath: '/path/to/job/2',
              },
            },
          ],
        },
      },
    };

    // Set up the mock to return our test data
    (gqlModule.graphQLClient.request as MockFunction).mockResolvedValueOnce(
      mockResponse
    );

    // Call the function without options
    const result = await getJobs();

    // Verify headers were set
    expect(gqlModule.graphQLClient.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'max-age=60, stale-while-revalidate=59'
    );

    // Verify request was made with default options
    expect(gqlModule.graphQLClient.request).toHaveBeenCalledWith(
      expect.anything(), // The query
      expect.objectContaining({
        first: 100,
        // Check other required vars are present
        fullPath: expect.any(String),
        statuses: expect.any(Array),
      })
    );

    // Verify the result is correct
    expect(result).toEqual({
      success: true,
      data: mockResponse.project,
    });
  });

  it('should fetch jobs with custom options when provided', async () => {
    // Mock successful response
    const mockResponse = {
      project: {
        jobs: {
          pageInfo: {
            endCursor: 'end-cursor',
            hasNextPage: true,
            hasPreviousPage: false,
            startCursor: 'start-cursor',
          },
          count: 1,
          nodes: [
            {
              name: 'run',
              finishedAt: '2023-01-01T12:00:00Z',
              detailedStatus: {
                detailsPath: '/path/to/job/1',
              },
            },
          ],
        },
      },
    };

    // Set up the mock to return our test data
    (gqlModule.graphQLClient.request as MockFunction).mockResolvedValueOnce(
      mockResponse
    );

    // Custom options
    const customOptions = {
      first: 1,
      after: 'some-cursor',
    };

    // Call the function with custom options
    const result = await getJobs(customOptions);

    // Verify request was made with custom options
    expect(gqlModule.graphQLClient.request).toHaveBeenCalledWith(
      expect.anything(), // The query
      expect.objectContaining({
        first: 1,
        after: 'some-cursor',
        // Check other required vars are present
        fullPath: expect.any(String),
        statuses: expect.any(Array),
      })
    );

    // Verify the result is correct
    expect(result).toEqual({
      success: true,
      data: mockResponse.project,
    });
  });

  it('should handle errors gracefully', async () => {
    // Set up the mock to throw an error
    const mockError = new Error('Network error');
    (gqlModule.graphQLClient.request as MockFunction).mockRejectedValueOnce(
      mockError
    );

    // Mock console.error to avoid cluttering test output
    console.error = vi.fn();

    // Call the function
    const result = await getJobs();

    // Verify error was logged
    expect(console.error).toHaveBeenCalledWith(mockError);

    // Verify the result contains the error
    expect(result).toEqual({
      success: false,
      error: 'Failed to fetch jobs',
    });
  });
});
