import { afterEach, describe, expect, it, vi } from 'vitest';

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

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  mocks.handleJobIngestionRequest.mockReset();
});

function post(body: string, headers: HeadersInit = {}) {
  return POST(
    new Request('http://localhost', { method: 'POST', body, headers })
  );
}

describe.each([
  ['unset', undefined, {}],
  ['set', 's3cret', { authorization: 'Bearer s3cret' }],
])(
  'POST /api/v1/insert-new-job-data with INGEST_SECRET %s',
  (_case, secret, headers) => {
    it('returns the error message in the webhook error response', async () => {
      vi.stubEnv('INGEST_SECRET', secret);
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mocks.handleJobIngestionRequest.mockResolvedValue({
        success: false,
        error: { code: 'WRITE_FAILED', message: 'Transaction failed' },
      });

      const response = await post('{}', headers);

      expect(response.status).toBe(202);
      expect(await response.text()).toBe('Webhook error: Transaction failed');
    });

    it.each(['TRANSFORM_FAILED', 'JOB_EXISTS', 'WRITE_FAILED'])(
      'answers 202 when the ingest returns %s',
      async (code) => {
        vi.stubEnv('INGEST_SECRET', secret);
        vi.spyOn(console, 'error').mockImplementation(() => {});
        mocks.handleJobIngestionRequest.mockResolvedValue({
          success: false,
          error: { code, message: `${code} message` },
        });

        const response = await post('{}', headers);

        expect(response.status).toBe(202);
        expect(await response.text()).toBe(`Webhook error: ${code} message`);
      }
    );

    it('returns the stored Job and inserted counts on success', async () => {
      vi.stubEnv('INGEST_SECRET', secret);
      const data = {
        job: { id: 'job-1', gitLabJobId: 'gl-42' },
        inserted: {
          procedures: 1,
          institutions: 2,
          maxAllowedDays: 1,
          waitingPeriods: 2,
        },
      };
      mocks.handleJobIngestionRequest.mockResolvedValue({
        success: true,
        data,
      });

      const response = await post('{}', headers);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ success: true, data });
    });
  }
);

describe('POST /api/v1/insert-new-job-data with INGEST_SECRET set', () => {
  it.each([
    ['no header', {}],
    ['a wrong token', { authorization: 'Bearer wrong' }],
    ['a non-Bearer scheme', { authorization: 'Basic s3cret' }],
  ])(
    'returns 401 for %s without parsing the body or ingesting',
    async (_case, headers) => {
      vi.stubEnv('INGEST_SECRET', 's3cret');

      // Invalid JSON: a 401 (not a throw) shows request.json() never ran
      const response = await post('not json', headers);

      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({
        success: false,
        error: { code: 'UNAUTHORIZED' },
      });
      expect(mocks.handleJobIngestionRequest).not.toHaveBeenCalled();
    }
  );
});
