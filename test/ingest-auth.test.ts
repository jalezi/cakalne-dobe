import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let requireIngestAuth: typeof import('../src/lib/ingest-auth').requireIngestAuth;

beforeEach(async () => {
  // Fresh module per test, so the once-per-process warning flag starts unset
  vi.resetModules();
  ({ requireIngestAuth } = await import('../src/lib/ingest-auth'));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function request(authorization?: string) {
  return new Request('http://localhost', {
    method: 'POST',
    headers: authorization ? { authorization } : {},
  });
}

describe('requireIngestAuth with INGEST_SECRET set', () => {
  beforeEach(() => {
    vi.stubEnv('INGEST_SECRET', 's3cret');
  });

  it.each([
    ['no header', undefined],
    ['a wrong token', 'Bearer wrong'],
    ['a longer wrong token', 'Bearer s3cret-and-more'],
    ['a non-Bearer scheme', 'Basic s3cret'],
    ['a bare token', 's3cret'],
  ])('returns 401 UNAUTHORIZED for %s', async (_case, authorization) => {
    const response = requireIngestAuth(request(authorization));

    expect(response?.status).toBe(401);
    expect(await response?.json()).toEqual({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid Authorization header',
      },
    });
  });

  it('lets the request through with the right Bearer token', () => {
    expect(requireIngestAuth(request('Bearer s3cret'))).toBeNull();
  });
});

describe('requireIngestAuth with INGEST_SECRET unset', () => {
  it.each([
    ['unset', undefined],
    ['empty', ''],
  ])('lets any request through when the secret is %s', (_case, value) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('INGEST_SECRET', value);

    expect(requireIngestAuth(request())).toBeNull();
    expect(requireIngestAuth(request('Bearer anything'))).toBeNull();
  });

  it('warns once per process, not once per request', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('INGEST_SECRET', '');

    requireIngestAuth(request());
    requireIngestAuth(request());

    expect(warn).toHaveBeenCalledTimes(1);
  });
});
