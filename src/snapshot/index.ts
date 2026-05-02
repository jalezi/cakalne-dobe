import type * as schema from '@/db/schema';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import type { Result, SnapshotInsertPayload } from '@/types';
import {
  createHttpSnapshotSource,
  type SnapshotSource,
  type SnapshotSourceMeta,
} from './source';
import {
  prepareSnapshotInsertPayload,
  type SnapshotTransformerMeta,
} from './transformer';

export async function fetchSnapshot(
  gitLabJobId: string
): Promise<Result<AllData, SnapshotSourceMeta>> {
  return createHttpSnapshotSource().fetchSnapshot(gitLabJobId);
}

export type PreparedSnapshot = {
  jobData: schema.InsertJob;
  snapshotInsertPayload: SnapshotInsertPayload;
};

type SnapshotPipelineMeta = SnapshotSourceMeta | SnapshotTransformerMeta;

export async function fetchAndPrepareSnapshotFromSource(
  gitLabJobId: string,
  source: SnapshotSource
): Promise<Result<PreparedSnapshot, SnapshotPipelineMeta>> {
  const fetchResult = await source.fetchSnapshot(gitLabJobId);
  if (!fetchResult.success) {
    return fetchResult;
  }

  const data = fetchResult.data;
  const jobData: schema.InsertJob = {
    gitLabJobId,
    startDate: data.start,
    endDate: data.end,
  };

  const payloadResult = prepareSnapshotInsertPayload(data, gitLabJobId);
  if (!payloadResult.success) {
    return payloadResult;
  }

  return {
    success: true,
    data: {
      jobData,
      snapshotInsertPayload: payloadResult.data,
    },
  };
}

export async function fetchAndPrepareSnapshot(
  gitLabJobId: string
): Promise<Result<PreparedSnapshot, SnapshotPipelineMeta>> {
  return fetchAndPrepareSnapshotFromSource(
    gitLabJobId,
    createHttpSnapshotSource()
  );
}
