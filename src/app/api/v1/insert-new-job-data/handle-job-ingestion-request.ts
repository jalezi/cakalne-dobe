import type { ActionReturnType as IngestReturnType } from '@/types';
import { getLastJobId } from '@/utils/get-last-job-id';
import { processJobData } from './db-operations';
import { prepareJobData, shouldInsertLatestJob } from './job-processing';
import { validateWebhookPayload } from './validation';

type TransactionResult = Awaited<ReturnType<typeof processJobData>>;

export async function handleJobIngestionRequest(
  rawBody: unknown
): Promise<IngestReturnType<TransactionResult>> {
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
    return { success: false, error: lastGitLabIdResponse.error };
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
      preparedJobData.data.notCompleteDataObj
    );
    return { success: true, data: transactionResponse };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Transaction failed';
    return { success: false, error: message };
  }
}
