import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import { fetchSnapshot } from '../src/snapshot';

vi.stubGlobal('fetch', vi.fn());

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

describe('fetchSnapshot', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns error when HTTP fetch fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 404, statusText: 'Not Found' })
    );

    const result = await fetchSnapshot('gl-123');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('gl-123');
    }
  });

  it('returns error when the server fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 500, statusText: 'Internal Server Error' })
    );

    const result = await fetchSnapshot('gl-999');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('gl-999');
    }
  });

  it('returns error when response body fails schema validation', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ invalid: true }), { status: 200 })
    );

    const result = await fetchSnapshot('gl-123');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('gl-123');
    }
  });

  it('returns validated AllData on success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(VALID_SNAPSHOT), { status: 200 })
    );

    const result = await fetchSnapshot('gl-123');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(VALID_SNAPSHOT);
    }
  });
});
