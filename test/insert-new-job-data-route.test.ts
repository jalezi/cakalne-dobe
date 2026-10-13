import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  handleJobIngestionRequest: vi.fn(),
}));

vi.mock(
  '../src/app/api/v1/insert-new-job-data/handle-job-ingestion-request',
  () => ({
    handleJobIngestionRequest: mocks.handleJobIngestionRequest,
  })
);

import { POST } from '../src/app/api/v1/insert-new-job-data/route';

describe('POST /api/v1/insert-new-job-data', () => {
  it('returns the error message in the webhook error response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.handleJobIngestionRequest.mockResolvedValue({
      success: false,
      error: { code: 'TRANSACTION_FAILED', message: 'Transaction failed' },
    });

    const response = await POST(
      new Request('http://localhost', { method: 'POST', body: '{}' })
    );

    expect(response.status).toBe(202);
    expect(await response.text()).toBe('Webhook error: Transaction failed');
  });
});
