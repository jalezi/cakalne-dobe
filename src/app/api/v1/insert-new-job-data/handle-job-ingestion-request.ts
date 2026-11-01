import { db } from '@/db';
import { fetchSnapshot, ingestSnapshot } from '@/snapshot';
import type { IngestedSnapshot } from '@/snapshot/ingest';
import type { Result } from '@/types';
import { getLastJobId } from '@/utils/get-last-job-id';
import { shouldInsertLatestJob } from './job-processing';
import { validateWebhookPayload } from './validation';

const INGESTION_ERRORS = {
  GET_JOB_ID_FAILED: 'GET_JOB_ID_FAILED',
} as const;

export async function handleJobIngestionRequest(
  rawBody: unknown
): Promise<Result<IngestedSnapshot>> {
  const validationResult = validateWebhookPayload(rawBody);
  if (!validationResult.success) {
    return { success: false, error: validationResult.error };
  }

  const shouldInsert = await shouldInsertLatestJob();
  if (!shouldInsert.success) {
    return { success: false, error: shouldInsert.error };
  }

  const lastGitLabIdResponse = await getLastJobId(10);
  if (!lastGitLabIdResponse.success) {
    return {
      success: false,
      error: {
        code: INGESTION_ERRORS.GET_JOB_ID_FAILED,
        message: lastGitLabIdResponse.error,
      },
    };
  }

  const gitLabJobId = lastGitLabIdResponse.data.gitLabJobId;
  const snapshot = await fetchSnapshot(gitLabJobId);
  if (!snapshot.success) {
    return { success: false, error: snapshot.error };
  }

  const ingested = await ingestSnapshot(db, gitLabJobId, snapshot.data);
  if (!ingested.success) {
    return { success: false, error: ingested.error };
  }
  return { success: true, data: ingested.data };
}
