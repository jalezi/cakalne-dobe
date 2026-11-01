import { createHash, timingSafeEqual } from 'node:crypto';

// Not read through ENV_SERVER_VARS: that is parsed once at import, and the
// check must see the current value (tests toggle it with vi.stubEnv)
let warnedUnset = false;

function sha256(value: string) {
  return createHash('sha256').update(value).digest();
}

/**
 * Checks `Authorization: Bearer <INGEST_SECRET>` on an ingest route.
 * Returns a 401 response to send back, or null to let the request through.
 * While INGEST_SECRET is unset or empty, every request goes through.
 */
export function requireIngestAuth(request: Request): Response | null {
  const secret = process.env.INGEST_SECRET;
  if (!secret) {
    if (!warnedUnset) {
      warnedUnset = true;
      console.warn(
        'INGEST_SECRET is not set: ingest routes accept any request'
      );
    }
    return null;
  }

  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : null;

  // Hashing first gives equal-length buffers, so timingSafeEqual never throws
  if (token !== null && timingSafeEqual(sha256(token), sha256(secret))) {
    return null;
  }

  return Response.json(
    {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid Authorization header',
      },
    },
    { status: 401 }
  );
}
