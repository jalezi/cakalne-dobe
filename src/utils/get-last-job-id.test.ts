import { describe, it, expect, vi } from 'vitest';
import { getLastJobId } from './get-last-job-id';
import { getJobs } from './get-jobs';

// Mock the getJobs function
vi.mock('./get-jobs');

// Define a more specific type for the mocked function
interface MockedGetJobs {
  mockResolvedValueOnce: (value: unknown) => void;
  mockRejectedValueOnce: (value: unknown) => void;
}

describe('getLastJobId', () => {
  it('should return the last job ID when a job is found', async () => {
    // Mock successful response from getJobs
    const mockJobsResponse = {
      success: true,
      data: {
        jobs: {
          nodes: [
            {
              name: 'run',
              finishedAt: '2023-01-01T12:00:00Z',
              detailedStatus: {
                detailsPath: '/path/to/job/12345',
              },
            },
            {
              name: 'other-job',
              finishedAt: '2023-01-02T12:00:00Z',
              detailedStatus: {
                detailsPath: '/path/to/job/67890',
              },
            },
          ],
          pageInfo: {
            endCursor: 'end-cursor',
            hasNextPage: false,
          },
        },
      },
    };

    // Set up the mock to return our test data
    (getJobs as unknown as MockedGetJobs).mockResolvedValueOnce(
      mockJobsResponse
    );

    // Call the function
    const result = await getLastJobId(10);

    // Verify getJobs was called with correct parameters
    expect(getJobs).toHaveBeenCalledWith({
      first: 10,
      after: undefined,
    });

    // Verify the result contains the correct job ID
    expect(result).toEqual({
      success: true,
      data: {
        gitLabJobId: '12345',
        jobFinishedAt: '2023-01-01T12:00:00Z',
      },
      meta: {
        params: {
          first: 10,
          after: undefined,
        },
        nodes: 2,
        pageInfo: {
          endCursor: 'end-cursor',
          hasNextPage: false,
        },
      },
    });
  });

  it('should return an error when getJobs fails', async () => {
    // Mock failed response from getJobs
    const mockErrorResponse = {
      success: false,
      error: 'Failed to fetch jobs',
    };

    // Set up the mock to return our error response
    (getJobs as unknown as MockedGetJobs).mockResolvedValueOnce(
      mockErrorResponse
    );

    // Call the function
    const result = await getLastJobId(10);

    // Verify the result contains the error
    expect(result).toEqual({
      success: false,
      error: 'Failed to fetch jobs',
      meta: {
        params: {
          first: 10,
          after: undefined,
        },
      },
    });
  });

  it('should return an error when no job with name "run" is found', async () => {
    // Mock successful response but with no matching job
    const mockJobsResponse = {
      success: true,
      data: {
        jobs: {
          nodes: [
            {
              name: 'other-job',
              finishedAt: '2023-01-02T12:00:00Z',
              detailedStatus: {
                detailsPath: '/path/to/job/67890',
              },
            },
          ],
          pageInfo: {
            endCursor: 'end-cursor',
            hasNextPage: false,
          },
        },
      },
    };

    // Set up the mock to return our test data
    (getJobs as unknown as MockedGetJobs).mockResolvedValueOnce(
      mockJobsResponse
    );

    // Call the function
    const result = await getLastJobId(10);

    // Verify the result indicates no job was found
    expect(result).toEqual({
      success: false,
      error: 'No job found',
      meta: {
        params: {
          first: 10,
          after: undefined,
        },
        nodes: 1,
        pageInfo: {
          endCursor: 'end-cursor',
          hasNextPage: false,
        },
      },
    });
  });

  it('should return an error when the GitLab job ID is missing', async () => {
    // Mock successful response but with invalid detailsPath
    const mockJobsResponse = {
      success: true,
      data: {
        jobs: {
          nodes: [
            {
              name: 'run',
              finishedAt: '2023-01-01T12:00:00Z',
              detailedStatus: {
                detailsPath: '', // Empty path, will result in no ID
              },
            },
          ],
          pageInfo: {
            endCursor: 'end-cursor',
            hasNextPage: false,
          },
        },
      },
    };

    // Set up the mock to return our test data
    (getJobs as unknown as MockedGetJobs).mockResolvedValueOnce(
      mockJobsResponse
    );

    // Call the function
    const result = await getLastJobId(10);

    // Verify the result indicates the GitLab job ID is missing
    expect(result).toEqual({
      success: false,
      error: 'GitLab job ID is missing',
      meta: {
        params: {
          first: 10,
          after: undefined,
        },
        nodes: 1,
        pageInfo: {
          endCursor: 'end-cursor',
          hasNextPage: false,
        },
      },
    });
  });
});
