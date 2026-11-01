import { describe, expect, it, vi } from 'vitest';
import { GIT_LAB_GRAPHQL_API_URL } from '@/lib/gql';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import {
  createHttpGitLabSource,
  createInMemoryGitLabSource,
} from '../src/snapshot/source';

const VALID_SNAPSHOT: AllData = {
  start: '2024-01-01',
  end: '2024-01-02',
  procedures: [
    {
      code: 'P1',
      name: 'Procedure 1',
      maxAllowedDays: { regular: 10, fast: 5, veryFast: 1 },
      waitingPeriods: {
        regular: [{ facility: 'Hospital A', days: 5 }],
        fast: [{ facility: 'Hospital A', days: 2 }],
        veryFast: null,
      },
    },
  ],
};

// GitLab lists the newest job first
function jobsResponse(nodes: { name: string; id: string }[]) {
  return new Response(
    JSON.stringify({
      data: {
        project: {
          jobs: {
            pageInfo: {
              endCursor: 'end',
              hasNextPage: true,
              hasPreviousPage: false,
              startCursor: 'start',
            },
            count: nodes.length,
            nodes: nodes.map(({ name, id }) => ({
              name,
              finishedAt: '2026-11-01T04:20:00Z',
              detailedStatus: {
                detailsPath: `/wayback-automachine/cakalne-dobe/-/jobs/${id}`,
              },
            })),
          },
        },
      },
    })
  );
}

function httpSource(response: Response) {
  const fetchMock = vi.fn().mockResolvedValueOnce(response);
  return { fetchMock, source: createHttpGitLabSource(fetchMock) };
}

describe('createHttpGitLabSource', () => {
  describe('latestRunJob', () => {
    it('returns the newest run job among the latest 10 successful jobs', async () => {
      const { fetchMock, source } = httpSource(
        jobsResponse([
          { name: 'pages', id: '333' },
          { name: 'run', id: '222' },
          { name: 'run', id: '111' },
        ])
      );

      const result = await source.latestRunJob();

      expect(result).toEqual({ success: true, data: { gitLabJobId: '222' } });
      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(GIT_LAB_GRAPHQL_API_URL);
      const body = JSON.parse(init.body as string) as { variables: unknown };
      expect(body.variables).toMatchObject({
        first: 10,
        statuses: ['SUCCESS'],
      });
    });

    it('returns NO_RUN_JOB when no run job is listed', async () => {
      const { source } = httpSource(jobsResponse([{ name: 'pages', id: '3' }]));

      const result = await source.latestRunJob();

      expect(result).toMatchObject({
        success: false,
        error: { code: 'NO_RUN_JOB' },
      });
    });

    it('returns JOBS_FETCH_FAILED when the response does not match the job list schema', async () => {
      const { source } = httpSource(
        new Response(JSON.stringify({ data: { project: null } }))
      );

      const result = await source.latestRunJob();

      expect(result).toMatchObject({
        success: false,
        error: { code: 'JOBS_FETCH_FAILED' },
      });
    });

    it('returns JOBS_FETCH_FAILED on a non-ok response', async () => {
      const { source } = httpSource(
        new Response(null, { status: 502, statusText: 'Bad Gateway' })
      );

      const result = await source.latestRunJob();

      expect(result).toEqual({
        success: false,
        error: {
          code: 'JOBS_FETCH_FAILED',
          message: 'Failed to fetch the GitLab job list: 502 Bad Gateway',
        },
      });
    });
  });

  describe('fetchSnapshot', () => {
    it('returns FETCH_FAILED on a non-ok response', async () => {
      const { source } = httpSource(
        new Response(null, { status: 500, statusText: 'Internal Server Error' })
      );

      const result = await source.fetchSnapshot('gl-1');

      expect(result).toMatchObject({
        success: false,
        error: { code: 'FETCH_FAILED' },
      });
    });

    it('returns SNAPSHOT_INVALID on schema mismatch', async () => {
      const { source } = httpSource(
        new Response(JSON.stringify({ bad: true }))
      );

      const result = await source.fetchSnapshot('gl-1');

      expect(result).toMatchObject({
        success: false,
        error: { code: 'SNAPSHOT_INVALID' },
      });
    });
  });
});

describe('createInMemoryGitLabSource', () => {
  it('returns the newest run job of its job list', async () => {
    const source = createInMemoryGitLabSource({
      jobs: [
        { name: 'pages', gitLabJobId: '3' },
        { name: 'run', gitLabJobId: '2' },
      ],
      snapshots: {},
    });

    await expect(source.latestRunJob()).resolves.toEqual({
      success: true,
      data: { gitLabJobId: '2' },
    });
  });

  it('returns JOBS_FETCH_FAILED when its job list is null', async () => {
    const source = createInMemoryGitLabSource({ jobs: null, snapshots: {} });

    await expect(source.latestRunJob()).resolves.toMatchObject({
      success: false,
      error: { code: 'JOBS_FETCH_FAILED' },
    });
  });

  it('returns a stored Snapshot and records each fetched id', async () => {
    const source = createInMemoryGitLabSource({
      jobs: [],
      snapshots: { 'gl-1': VALID_SNAPSHOT },
    });

    await expect(source.fetchSnapshot('gl-1')).resolves.toEqual({
      success: true,
      data: VALID_SNAPSHOT,
    });
    await expect(source.fetchSnapshot('missing')).resolves.toMatchObject({
      success: false,
      error: { code: 'FETCH_FAILED' },
    });
    expect(source.fetched).toEqual(['gl-1', 'missing']);
  });
});
