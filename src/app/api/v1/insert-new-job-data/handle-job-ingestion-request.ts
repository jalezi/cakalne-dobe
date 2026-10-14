import type { Result } from '@/types';
import { getLastJobId } from '@/utils/get-last-job-id';
import { processJobData } from './db-operations';
import { prepareJobData, shouldInsertLatestJob } from './job-processing';
import { validateWebhookPayload } from './validation';

const INGESTION_ERRORS = {
  GET_JOB_ID_FAILED: 'GET_JOB_ID_FAILED',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
} as const;

type TransactionResult = Awaited<ReturnType<typeof processJobData>>;

export async function handleJobIngestionRequest(
  rawBody: unknown
): Promise<Result<TransactionResult>> {
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

  const preparedJobData = await prepareJobData(
    lastGitLabIdResponse.data.gitLabJobId
  );
  if (!preparedJobData.success) {
    return { success: false, error: preparedJobData.error };
  }

  try {
    const transactionResponse = await processJobData(
      preparedJobData.data.jobData,
      preparedJobData.data.snapshotInsertPayload
    );
    return { success: true, data: transactionResponse };
  } catch (error) {
    let message = error instanceof Error ? error.message : 'Transaction failed';
    // A failed query's message names the step; the database's reason is its cause
    if (error instanceof Error && error.cause instanceof Error) {
      message += `\ncause: ${error.cause.message}`;
    }
    return {
      success: false,
      error: { code: INGESTION_ERRORS.TRANSACTION_FAILED, message },
    };
  }
}
