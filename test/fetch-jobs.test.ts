import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from 'vitest';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import { fetchSnapshot } from '@/snapshot';
import { getJobs } from '@/utils/get-jobs';
import {
  extractJobId,
  fetchJobs,
  formatJobDate,
  generateFilename,
} from '../scripts/fetch-jobs';

vi.mock('@/utils/get-jobs', () => ({ getJobs: vi.fn() }));
vi.mock('@/snapshot', () => ({ fetchSnapshot: vi.fn() }));

// formatJobDate reads local time, so build the timestamp from local time:
// 2024-03-01 09:05:09 in whatever time zone the test runs in
const FINISHED_AT = new Date(2024, 2, 1, 9, 5, 9).toISOString();

const SNAPSHOT: AllData = {
  start: '2024-03-01',
  end: '2024-03-01',
  procedures: [],
};

function job(id: string) {
  return {
    name: 'run',
    finishedAt: FINISHED_AT,
    detailedStatus: {
      detailsPath: `/wayback-automachine/cakalne-dobe/-/jobs/${id}`,
    },
  };
}

function page(
  jobs: ReturnType<typeof job>[],
  { hasNextPage = false, endCursor = 'end' } = {}
) {
  return {
    success: true as const,
    data: {
      jobs: {
        pageInfo: {
          endCursor,
          hasNextPage,
          hasPreviousPage: false,
          startCursor: 'start',
        },
        count: jobs.length,
        nodes: jobs,
      },
    },
  };
}

describe('extractJobId', () => {
  it('returns the job ID from a detailsPath', () => {
    expect(
      extractJobId('/wayback-automachine/cakalne-dobe/-/jobs/7041049865')
    ).toBe('7041049865');
  });

  it('throws when the path has no job ID', () => {
    expect(() =>
      extractJobId('/wayback-automachine/cakalne-dobe/-/pipelines/1')
    ).toThrow(
      'Could not extract job ID from path: /wayback-automachine/cakalne-dobe/-/pipelines/1'
    );
  });
});

describe('formatJobDate', () => {
  it('formats the date in local time, zero-padded', () => {
    expect(formatJobDate(FINISHED_AT)).toBe('2024-03-01-09-05-09');
  });
});

describe('generateFilename', () => {
  it('builds wp-<date>-<job ID>.json', () => {
    expect(generateFilename('7041049865', FINISHED_AT)).toBe(
      'wp-2024-03-01-09-05-09-7041049865.json'
    );
  });
});

describe('fetchJobs', () => {
  let outputDir: string;
  let log: MockInstance;

  beforeEach(async () => {
    vi.resetAllMocks();
    log = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fetchSnapshot).mockResolvedValue({
      success: true,
      data: SNAPSHOT,
    });
    outputDir = await mkdtemp(join(tmpdir(), 'fetch-jobs-'));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(outputDir, { recursive: true, force: true });
  });

  it('saves a new job', async () => {
    vi.mocked(getJobs).mockResolvedValueOnce(page([job('101')]));

    await fetchJobs({ outputDir });

    expect(fetchSnapshot).toHaveBeenCalledWith('101');
    const saved = await readFile(
      join(outputDir, generateFilename('101', FINISHED_AT)),
      'utf-8'
    );
    expect(JSON.parse(saved)).toEqual(SNAPSHOT);
    expect(log).toHaveBeenCalledWith('  ✅ Success: 1');
  });

  it('skips a job whose file already exists', async () => {
    const filePath = join(outputDir, generateFilename('101', FINISHED_AT));
    await writeFile(filePath, '{"existing":true}', 'utf-8');
    vi.mocked(getJobs).mockResolvedValueOnce(page([job('101')]));

    await fetchJobs({ outputDir });

    expect(fetchSnapshot).not.toHaveBeenCalled();
    expect(await readFile(filePath, 'utf-8')).toBe('{"existing":true}');
    expect(log).toHaveBeenCalledWith('  ⏭️  Skipped: 1');
  });

  it('counts a failed fetch as an error', async () => {
    vi.mocked(getJobs).mockResolvedValueOnce(page([job('101')]));
    vi.mocked(fetchSnapshot).mockResolvedValueOnce({
      success: false,
      error: { code: 'FETCH_FAILED', message: 'Failed to fetch snapshot' },
    });

    await fetchJobs({ outputDir });

    expect(await readdir(outputDir)).toEqual([]);
    expect(log).toHaveBeenCalledWith('  ✅ Success: 0');
    expect(log).toHaveBeenCalledWith('  ❌ Errors: 1');
  });

  it('stops paging once it has count jobs', async () => {
    vi.mocked(getJobs)
      .mockResolvedValueOnce(
        page([job('101')], { hasNextPage: true, endCursor: 'c1' })
      )
      .mockResolvedValueOnce(
        page([job('102')], { hasNextPage: true, endCursor: 'c2' })
      );

    await fetchJobs({ count: 2, outputDir });

    expect(getJobs).toHaveBeenCalledTimes(2);
    expect(getJobs).toHaveBeenNthCalledWith(1, { first: 2, after: undefined });
    expect(getJobs).toHaveBeenNthCalledWith(2, { first: 1, after: 'c1' });
  });

  it('stops paging at the last page', async () => {
    vi.mocked(getJobs)
      .mockResolvedValueOnce(
        page([job('101')], { hasNextPage: true, endCursor: 'c1' })
      )
      .mockResolvedValueOnce(page([job('102')], { hasNextPage: false }));

    await fetchJobs({ count: 10, outputDir });

    expect(getJobs).toHaveBeenCalledTimes(2);
    expect(getJobs).toHaveBeenNthCalledWith(1, {
      first: 10,
      after: undefined,
    });
    expect(getJobs).toHaveBeenNthCalledWith(2, { first: 9, after: 'c1' });
  });

  it('throws when the job list cannot be fetched', async () => {
    vi.mocked(getJobs).mockResolvedValueOnce({
      success: false,
      error: 'Failed to fetch jobs',
    });

    await expect(fetchJobs({ outputDir })).rejects.toThrow(
      'Failed to fetch jobs: Failed to fetch jobs'
    );
  });
});
