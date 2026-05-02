import type * as schema from '@/db/schema';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import type { ActionReturnType, SnapshotInsertPayload } from '@/types';
import {
  createHttpSnapshotSource,
  type SnapshotSource,
  type SnapshotSourceErrorDetails,
} from './source';
import {
  prepareSnapshotInsertPayload,
  type SnapshotTransformerErrorDetails,
} from './transformer';

export async function fetchSnapshot(
  gitLabJobId: string
): Promise<ActionReturnType<AllData, undefined, SnapshotSourceErrorDetails>> {
  return createHttpSnapshotSource().fetchSnapshot(gitLabJobId);
}

export type PreparedSnapshot = {
  jobData: schema.InsertJob;
  snapshotInsertPayload: SnapshotInsertPayload;
};

type SnapshotPipelineErrorDetails =
  | SnapshotSourceErrorDetails
  | SnapshotTransformerErrorDetails;

export async function fetchAndPrepareSnapshotFromSource(
  gitLabJobId: string,
  source: SnapshotSource
): Promise<
  ActionReturnType<PreparedSnapshot, undefined, SnapshotPipelineErrorDetails>
> {
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
): Promise<
  ActionReturnType<PreparedSnapshot, undefined, SnapshotPipelineErrorDetails>
> {
  return fetchAndPrepareSnapshotFromSource(
    gitLabJobId,
    createHttpSnapshotSource()
  );
}
