import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { projectJobsQuery } from '@/lib/gql';
import { getJobs } from './get-jobs';

const mockFetch = vi.fn();

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const getRequest = () => {
  const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
  const body = JSON.parse(init.body as string) as {
    query: string;
    variables: Record<string, unknown>;
  };
  return { url, init, body };
};

const mockProject = {
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
};

describe('getJobs', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    // Mock console.error to avoid cluttering test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    mockFetch.mockReset();
  });

  it('should POST the query with default options when no options are provided', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ data: { project: mockProject } })
    );

    const result = await getJobs();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const { url, init, body } = getRequest();
    expect(url).toBe('https://gitlab.com/api/graphql');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      'Cache-Control': 'max-age=60, stale-while-revalidate=59',
    });
    expect(body).toEqual({
      query: projectJobsQuery,
      variables: {
        first: 100,
        fullPath: 'wayback-automachine/cakalne-dobe',
        statuses: ['SUCCESS'],
      },
    });

    expect(result).toEqual({ success: true, data: mockProject });
  });

  it('should POST the query with custom options when provided', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ data: { project: mockProject } })
    );

    const result = await getJobs({ first: 1, after: 'some-cursor' });

    expect(getRequest().body.variables).toEqual({
      first: 1,
      after: 'some-cursor',
      fullPath: 'wayback-automachine/cakalne-dobe',
      statuses: ['SUCCESS'],
    });
    expect(result).toEqual({ success: true, data: mockProject });
  });

  it('should fail on a non-2xx status', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ data: { project: mockProject } }, 500)
    );

    const result = await getJobs();

    expect(console.error).toHaveBeenCalled();
    expect(result).toEqual({ success: false, error: 'Failed to fetch jobs' });
  });

  it('should fail on a GraphQL errors body', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        data: { project: null },
        errors: [{ message: 'Field does not exist' }],
      })
    );

    const result = await getJobs();

    expect(console.error).toHaveBeenCalled();
    expect(result).toEqual({ success: false, error: 'Failed to fetch jobs' });
  });

  it('should fail when fetch rejects', async () => {
    const mockError = new Error('Network error');
    mockFetch.mockRejectedValueOnce(mockError);

    const result = await getJobs();

    expect(console.error).toHaveBeenCalledWith(mockError);
    expect(result).toEqual({ success: false, error: 'Failed to fetch jobs' });
  });
});
