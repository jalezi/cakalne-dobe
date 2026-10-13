import { readFile } from 'node:fs/promises';
import type { ZodIssue } from 'zod';
import { type AllData, allDataSchema } from '@/lib/zod-schemas/data-schemas';
import type { Result } from '@/types';

const BASE_JOBS_URL =
  'https://wayback-automachine.gitlab.io/-/cakalne-dobe/-/jobs';

export const SNAPSHOT_SOURCE_ERRORS = {
  FETCH_FAILED: 'FETCH_FAILED',
  SNAPSHOT_INVALID: 'SNAPSHOT_INVALID',
} as const;

export type SnapshotSourceMeta = { issues?: ZodIssue[] };

export type SnapshotSource = {
  fetchSnapshot(
    gitLabJobId: string
  ): Promise<Result<AllData, SnapshotSourceMeta>>;
};

export const snapshotUrl = (gitLabJobId: string) =>
  `${BASE_JOBS_URL}/${gitLabJobId}/artifacts/out.json`;

export function createHttpSnapshotSource(
  fetchImpl: typeof fetch = fetch
): SnapshotSource {
  return {
    async fetchSnapshot(gitLabJobId: string) {
      const res = await fetchImpl(snapshotUrl(gitLabJobId));

      if (!res.ok) {
        return {
          success: false,
          error: {
            code: SNAPSHOT_SOURCE_ERRORS.FETCH_FAILED,
            message: `Failed to fetch snapshot for job ${gitLabJobId}: ${res.status} ${res.statusText}`,
          },
        };
      }

      const raw = await res.json();
      const parsed = allDataSchema.safeParse(raw);

      if (!parsed.success) {
        return {
          success: false,
          error: {
            code: SNAPSHOT_SOURCE_ERRORS.SNAPSHOT_INVALID,
            message: `Invalid snapshot data for job ${gitLabJobId}`,
          },
          meta: { issues: parsed.error.issues },
        };
      }

      return { success: true, data: parsed.data };
    },
  };
}

export function createInMemorySnapshotSource(
  snapshots: Record<string, AllData>
): SnapshotSource {
  return {
    async fetchSnapshot(gitLabJobId: string) {
      const snapshot = snapshots[gitLabJobId];

      if (!snapshot) {
        return {
          success: false,
          error: {
            code: SNAPSHOT_SOURCE_ERRORS.FETCH_FAILED,
            message: `No in-memory snapshot found for job ${gitLabJobId}`,
          },
        };
      }

      return { success: true, data: snapshot };
    },
  };
}

export function createFileSnapshotSource(
  resolvePath: (gitLabJobId: string) => string
): SnapshotSource {
  return {
    async fetchSnapshot(gitLabJobId: string) {
      const path = resolvePath(gitLabJobId);
      let rawText: string;

      try {
        rawText = await readFile(path, 'utf8');
      } catch {
        return {
          success: false,
          error: {
            code: SNAPSHOT_SOURCE_ERRORS.FETCH_FAILED,
            message: `Failed to read snapshot file for job ${gitLabJobId}`,
          },
        };
      }

      let rawJson: unknown;
      try {
        rawJson = JSON.parse(rawText);
      } catch {
        return {
          success: false,
          error: {
            code: SNAPSHOT_SOURCE_ERRORS.SNAPSHOT_INVALID,
            message: `Invalid snapshot data for job ${gitLabJobId}`,
          },
        };
      }

      const parsed = allDataSchema.safeParse(rawJson);
      if (!parsed.success) {
        return {
          success: false,
          error: {
            code: SNAPSHOT_SOURCE_ERRORS.SNAPSHOT_INVALID,
            message: `Invalid snapshot data for job ${gitLabJobId}`,
          },
          meta: { issues: parsed.error.issues },
        };
      }

      return { success: true, data: parsed.data };
    },
  };
}
