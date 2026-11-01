import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  validateWebhookPayload: vi.fn(),
  shouldInsertLatestJob: vi.fn(),
  getLastJobId: vi.fn(),
  fetchSnapshot: vi.fn(),
  ingestSnapshot: vi.fn(),
}));

vi.mock('../src/app/api/v1/insert-new-job-data/validation', () => ({
  validateWebhookPayload: mocks.validateWebhookPayload,
}));

vi.mock('../src/app/api/v1/insert-new-job-data/job-processing', () => ({
  shouldInsertLatestJob: mocks.shouldInsertLatestJob,
}));

vi.mock('@/db', () => ({ db: { name: 'app db' } }));

vi.mock('@/snapshot', () => ({
  fetchSnapshot: mocks.fetchSnapshot,
  ingestSnapshot: mocks.ingestSnapshot,
}));

vi.mock('@/utils/get-last-job-id', () => ({
  getLastJobId: mocks.getLastJobId,
}));

import { handleJobIngestionRequest } from '../src/app/api/v1/insert-new-job-data/handle-job-ingestion-request';

const SNAPSHOT = { start: '2026-04-01', end: '2026-04-02', procedures: [] };

const INGESTED = {
  job: { id: 'job-1', gitLabJobId: 'gl-42' },
  inserted: {
    procedures: 1,
    institutions: 1,
    maxAllowedDays: 1,
    waitingPeriods: 1,
  },
};

describe('handleJobIngestionRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error and stops when payload validation fails', async () => {
    mocks.validateWebhookPayload.mockReturnValueOnce({
      success: false,
      error: { code: 'INVALID_PAYLOAD', message: 'Invalid webhook payload' },
    });

    const result = await handleJobIngestionRequest({ unknown: 'payload' });

    expect(result).toEqual({
      success: false,
      error: { code: 'INVALID_PAYLOAD', message: 'Invalid webhook payload' },
    });
    expect(mocks.shouldInsertLatestJob).not.toHaveBeenCalled();
  });

  it('returns error and stops when latest job already exists in DB', async () => {
    mocks.validateWebhookPayload.mockReturnValueOnce({
      success: true,
      data: { success: true },
    });
    mocks.shouldInsertLatestJob.mockResolvedValueOnce({
      success: false,
      error: {
        code: 'JOB_ALREADY_EXISTS',
        message: 'Latest job already exists in the database',
      },
    });

    const result = await handleJobIngestionRequest({ success: true });

    expect(result).toEqual({
      success: false,
      error: {
        code: 'JOB_ALREADY_EXISTS',
        message: 'Latest job already exists in the database',
      },
    });
    expect(mocks.getLastJobId).not.toHaveBeenCalled();
  });

  it('returns error and stops when getLastJobId fails', async () => {
    mocks.validateWebhookPayload.mockReturnValueOnce({
      success: true,
      data: { success: true },
    });
    mocks.shouldInsertLatestJob.mockResolvedValueOnce({
      success: true,
      data: 'ok',
    });
    mocks.getLastJobId.mockResolvedValueOnce({
      success: false,
      error: 'GitLab API error',
    });

    const result = await handleJobIngestionRequest({ success: true });

    expect(result).toEqual({
      success: false,
      error: { code: 'GET_JOB_ID_FAILED', message: 'GitLab API error' },
    });
    expect(mocks.fetchSnapshot).not.toHaveBeenCalled();
  });

  it('returns error and stops when the Snapshot fetch fails', async () => {
    mocks.validateWebhookPayload.mockReturnValueOnce({
      success: true,
      data: { success: true },
    });
    mocks.shouldInsertLatestJob.mockResolvedValueOnce({
      success: true,
      data: 'ok',
    });
    mocks.getLastJobId.mockResolvedValueOnce({
      success: true,
      data: { gitLabJobId: 'gl-42' },
    });
    mocks.fetchSnapshot.mockResolvedValueOnce({
      success: false,
      error: { code: 'FETCH_FAILED', message: 'Failed to fetch job data' },
    });

    const result = await handleJobIngestionRequest({ success: true });

    expect(result).toEqual({
      success: false,
      error: { code: 'FETCH_FAILED', message: 'Failed to fetch job data' },
    });
    expect(mocks.ingestSnapshot).not.toHaveBeenCalled();
  });

  it('returns the ingest error when the Snapshot cannot be stored', async () => {
    mocks.validateWebhookPayload.mockReturnValueOnce({
      success: true,
      data: { success: true },
    });
    mocks.shouldInsertLatestJob.mockResolvedValueOnce({
      success: true,
      data: 'ok',
    });
    mocks.getLastJobId.mockResolvedValueOnce({
      success: true,
      data: { gitLabJobId: 'gl-42' },
    });
    mocks.fetchSnapshot.mockResolvedValueOnce({
      success: true,
      data: SNAPSHOT,
    });
    mocks.ingestSnapshot.mockResolvedValueOnce({
      success: false,
      error: { code: 'WRITE_FAILED', message: 'Failed query: …\ncause: …' },
    });

    const result = await handleJobIngestionRequest({ success: true });

    expect(result).toEqual({
      success: false,
      error: { code: 'WRITE_FAILED', message: 'Failed query: …\ncause: …' },
    });
  });

  it('ingests the latest Job into the app database when all steps succeed', async () => {
    mocks.validateWebhookPayload.mockReturnValueOnce({
      success: true,
      data: { success: true },
    });
    mocks.shouldInsertLatestJob.mockResolvedValueOnce({
      success: true,
      data: 'ok',
    });
    mocks.getLastJobId.mockResolvedValueOnce({
      success: true,
      data: { gitLabJobId: 'gl-42' },
    });
    mocks.fetchSnapshot.mockResolvedValueOnce({
      success: true,
      data: SNAPSHOT,
    });
    mocks.ingestSnapshot.mockResolvedValueOnce({
      success: true,
      data: INGESTED,
    });

    const result = await handleJobIngestionRequest({ success: true });

    expect(result).toEqual({ success: true, data: INGESTED });
    expect(mocks.fetchSnapshot).toHaveBeenCalledWith('gl-42');
    expect(mocks.ingestSnapshot).toHaveBeenCalledWith(
      { name: 'app db' },
      'gl-42',
      SNAPSHOT
    );
  });
});
