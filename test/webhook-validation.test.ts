import { describe, expect, it } from 'vitest';
import { validateWebhookPayload } from '../src/app/api/v1/insert-new-job-data/validation';

describe('validateWebhookPayload', () => {
  it('accepts a successful run', () => {
    expect(validateWebhookPayload({ success: true })).toEqual({
      success: true,
      data: { success: true },
    });
  });

  it('returns JOB_FAILED with the reported error for a failed run', () => {
    expect(
      validateWebhookPayload({ success: false, error: 'pipeline failed' })
    ).toEqual({
      success: false,
      error: { code: 'JOB_FAILED', message: 'pipeline failed' },
    });
  });

  it('returns INVALID_PAYLOAD for anything else', () => {
    expect(validateWebhookPayload({ success: 'ok' })).toEqual({
      success: false,
      error: { code: 'INVALID_PAYLOAD', message: 'Invalid webhook payload' },
    });
  });
});
