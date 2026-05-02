import { readFile } from 'node:fs/promises';
import type { ZodIssue } from 'zod';
import { type AllData, allDataSchema } from '@/lib/zod-schemas/data-schemas';
import type { ActionReturnType } from '@/types';

const BASE_JOBS_URL =
  'https://wayback-automachine.gitlab.io/-/cakalne-dobe/-/jobs';

export type SnapshotSourceErrorDetails = {
  code: 'FETCH_FAILED' | 'SNAPSHOT_INVALID';
  issues?: ZodIssue[];
};

export type SnapshotSource = {
  fetchSnapshot(
    gitLabJobId: string
  ): Promise<ActionReturnType<AllData, undefined, SnapshotSourceErrorDetails>>;
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
          error: `Failed to fetch snapshot for job ${gitLabJobId}: ${res.status} ${res.statusText}`,
          details: { code: 'FETCH_FAILED' },
        };
      }

      const raw = await res.json();
      const parsed = allDataSchema.safeParse(raw);

      if (!parsed.success) {
        return {
          success: false,
          error: `Invalid snapshot data for job ${gitLabJobId}`,
          details: {
            code: 'SNAPSHOT_INVALID',
            issues: parsed.error.issues,
          },
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
          error: `No in-memory snapshot found for job ${gitLabJobId}`,
          details: { code: 'FETCH_FAILED' },
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
          error: `Failed to read snapshot file for job ${gitLabJobId}`,
          details: { code: 'FETCH_FAILED' },
        };
      }

      let rawJson: unknown;
      try {
        rawJson = JSON.parse(rawText);
      } catch {
        return {
          success: false,
          error: `Invalid snapshot data for job ${gitLabJobId}`,
          details: { code: 'SNAPSHOT_INVALID' },
        };
      }

      const parsed = allDataSchema.safeParse(rawJson);
      if (!parsed.success) {
        return {
          success: false,
          error: `Invalid snapshot data for job ${gitLabJobId}`,
          details: {
            code: 'SNAPSHOT_INVALID',
            issues: parsed.error.issues,
          },
        };
      }

      return { success: true, data: parsed.data };
    },
  };
}
