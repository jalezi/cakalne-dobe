/**
 * @module InsertNewJobData
 * @description This module handles the insertion of new job data into the database.
 * It listens for incoming webhook requests, validates the payload, fetches job data,
 * and inserts the data into the database. It also handles errors and revalidates paths.
 */

import { handleError } from '@/utils/handle-error';
import { revalidatePath } from 'next/cache';
import { validateWebhookPayload } from './validation';
import { shouldInsertLatestJob, prepareJobData } from './job-processing';
import { processJobData } from './db-operations';
import { getLastJobId } from '@/utils/get-last-job-id';

export async function POST(request: Request) {
  try {
    const webhookJson = await request.json();

    const validationResult = validateWebhookPayload(webhookJson);
    if (!validationResult.success) {
      throw new Error(validationResult.error);
    }

    const shouldInsert = await shouldInsertLatestJob();
    if (!shouldInsert.success) {
      throw new Error(shouldInsert.error);
    }

    const lastGitLabIdResponse = await getLastJobId(10);
    if (!lastGitLabIdResponse.success) {
      throw new Error(lastGitLabIdResponse.error);
    }
    const gitLabJobId = lastGitLabIdResponse.data.gitLabJobId;

    const preparedJobData = await prepareJobData(gitLabJobId);
    if (!preparedJobData.success) {
      throw new Error(preparedJobData.error);
    }

    const transactionResponse = await processJobData(
      preparedJobData.data.jobData,
      preparedJobData.data.notCompleteDataObj
    );

    revalidateAllPaths();

    return Response.json({
      success: true,
      data: transactionResponse,
    });
  } catch (error) {
    const newError = handleError(error);
    console.error(newError);
    return new Response(`Webhook error: ${newError.message}`, {
      status: 202,
    });
  }
}

function revalidateAllPaths() {
  revalidatePath('/', 'layout');
  revalidatePath('/', 'page');
  revalidatePath('/[id]/', 'page');
}
