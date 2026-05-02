import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import {
  createFileSnapshotSource,
  createHttpSnapshotSource,
  createInMemorySnapshotSource,
} from '../src/snapshot/source';

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

describe('createHttpSnapshotSource', () => {
  it('returns FETCH_FAILED on non-ok response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { status: 500, statusText: 'Internal Server Error' })
      );
    const source = createHttpSnapshotSource(fetchMock as typeof fetch);

    const result = await source.fetchSnapshot('gl-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.details?.code).toBe('FETCH_FAILED');
    }
  });

  it('returns SNAPSHOT_INVALID on schema mismatch', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ bad: true })));
    const source = createHttpSnapshotSource(fetchMock as typeof fetch);

    const result = await source.fetchSnapshot('gl-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.details?.code).toBe('SNAPSHOT_INVALID');
    }
  });
});

describe('createInMemorySnapshotSource', () => {
  it('returns snapshot when key exists', async () => {
    const source = createInMemorySnapshotSource({ 'gl-1': VALID_SNAPSHOT });

    const result = await source.fetchSnapshot('gl-1');

    expect(result.success).toBe(true);
  });

  it('returns FETCH_FAILED when key is missing', async () => {
    const source = createInMemorySnapshotSource({});

    const result = await source.fetchSnapshot('missing');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.details?.code).toBe('FETCH_FAILED');
    }
  });
});

describe('createFileSnapshotSource', () => {
  it('returns FETCH_FAILED when file does not exist', async () => {
    const source = createFileSnapshotSource(
      (jobId) => `/tmp/non-existing-${jobId}.json`
    );

    const result = await source.fetchSnapshot('gl-404');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.details?.code).toBe('FETCH_FAILED');
    }
  });

  it('returns SNAPSHOT_INVALID when file contains invalid JSON', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'snapshot-source-'));
    const filePath = join(dir, 'bad.json');
    await writeFile(filePath, '{"broken":', 'utf8');

    const source = createFileSnapshotSource(() => filePath);
    const result = await source.fetchSnapshot('gl-bad-json');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.details?.code).toBe('SNAPSHOT_INVALID');
    }
  });
});
