import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  validateWebhookPayload: vi.fn(),
  shouldInsertLatestJob: vi.fn(),
  getLastJobId: vi.fn(),
  prepareJobData: vi.fn(),
  processJobData: vi.fn(),
}));

vi.mock('../src/app/api/v1/insert-new-job-data/validation', () => ({
  validateWebhookPayload: mocks.validateWebhookPayload,
}));

vi.mock('../src/app/api/v1/insert-new-job-data/job-processing', () => ({
  shouldInsertLatestJob: mocks.shouldInsertLatestJob,
  prepareJobData: mocks.prepareJobData,
}));

vi.mock('../src/app/api/v1/insert-new-job-data/db-operations', () => ({
  processJobData: mocks.processJobData,
}));

vi.mock('@/utils/get-last-job-id', () => ({
  getLastJobId: mocks.getLastJobId,
}));

import { handleJobIngestionRequest } from '../src/app/api/v1/insert-new-job-data/handle-job-ingestion-request';

const TRANSACTION_RESULT = {
  success: true,
  data: { job: { id: 'job-1', gitLabJobId: 'gl-42' } },
  meta: { length: { total: { total: 10, inserted: 10 } } },
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
    expect(mocks.prepareJobData).not.toHaveBeenCalled();
  });

  it('returns error and stops when job data preparation fails', async () => {
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
    mocks.prepareJobData.mockResolvedValueOnce({
      success: false,
      error: { code: 'FETCH_FAILED', message: 'Failed to fetch job data' },
    });

    const result = await handleJobIngestionRequest({ success: true });

    expect(result).toEqual({
      success: false,
      error: { code: 'FETCH_FAILED', message: 'Failed to fetch job data' },
    });
    expect(mocks.processJobData).not.toHaveBeenCalled();
  });

  it('returns error when the DB transaction throws', async () => {
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
    mocks.prepareJobData.mockResolvedValueOnce({
      success: true,
      data: { jobData: { gitLabJobId: 'gl-42' }, snapshotInsertPayload: {} },
    });
    mocks.processJobData.mockRejectedValueOnce(
      new Error('Transaction rolled back')
    );

    const result = await handleJobIngestionRequest({ success: true });

    expect(result).toEqual({
      success: false,
      error: { code: 'TRANSACTION_FAILED', message: 'Transaction rolled back' },
    });
  });

  it('returns success with transaction result when all steps succeed', async () => {
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
    mocks.prepareJobData.mockResolvedValueOnce({
      success: true,
      data: {
        jobData: { gitLabJobId: 'gl-42' },
        snapshotInsertPayload: {},
      },
    });
    mocks.processJobData.mockResolvedValueOnce(TRANSACTION_RESULT);

    const result = await handleJobIngestionRequest({ success: true });

    expect(result).toEqual({ success: true, data: TRANSACTION_RESULT });
    expect(mocks.prepareJobData).toHaveBeenCalledWith('gl-42');
  });
});
