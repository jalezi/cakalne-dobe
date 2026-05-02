import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import { fetchAndPrepareSnapshot, fetchSnapshot } from '../src/snapshot';

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
      expect(result.error).toContain('gl-123');
    }
  });

  it('returns error when response body fails schema validation', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ invalid: true }), { status: 200 })
    );

    const result = await fetchSnapshot('gl-123');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('gl-123');
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

describe('fetchAndPrepareSnapshot', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('propagates fetch error from fetchSnapshot', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 500, statusText: 'Internal Server Error' })
    );

    const result = await fetchAndPrepareSnapshot('gl-999');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('gl-999');
    }
  });

  it('returns jobData and snapshotInsertPayload on success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(VALID_SNAPSHOT), { status: 200 })
    );

    const result = await fetchAndPrepareSnapshot('gl-123');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.jobData).toMatchObject({
        gitLabJobId: 'gl-123',
        startDate: VALID_SNAPSHOT.start,
        endDate: VALID_SNAPSHOT.end,
      });
      expect(result.data.snapshotInsertPayload.procedures).toHaveLength(1);
      expect(result.data.snapshotInsertPayload.procedures[0].code).toBe('P1');
      expect(result.data.snapshotInsertPayload.institutions.size).toBe(1);
      expect(result.data.snapshotInsertPayload.maxAllowedDays).toHaveLength(1);
    }
  });
});
