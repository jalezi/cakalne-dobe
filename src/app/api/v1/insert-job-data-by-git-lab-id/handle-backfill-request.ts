/**
 * @module InsertJobDataByGitLabId
 * @description Backfills one Job by its GitLab job ID: validates the body,
 * downloads the Job's Snapshot and ingests it. `ingestSnapshot` refuses a Job
 * whose GitLab job ID or day is already stored (ADR-0002).
 */

import { z } from 'zod';
import type { db as appDb } from '@/db';
import { requireIngestAuth } from '@/lib/ingest-auth';
import { ingestSnapshot } from '@/snapshot';
import { INGEST_SNAPSHOT_ERRORS } from '@/snapshot/ingest';
import type { GitLabSource } from '@/snapshot/source';
import { handleError } from '@/utils/handle-error';

const INGEST_ERROR_STATUS: Record<keyof typeof INGEST_SNAPSHOT_ERRORS, number> =
  {
    [INGEST_SNAPSHOT_ERRORS.TRANSFORM_FAILED]: 400,
    [INGEST_SNAPSHOT_ERRORS.JOB_EXISTS]: 409,
    [INGEST_SNAPSHOT_ERRORS.WRITE_FAILED]: 500,
  };

const META_MAX_KEYS = 10;
const META_MAX_VALUE_LENGTH = 200;

// A note from the caller, logged and echoed back; what it may hold is #212's
const metaSchema = z
  .record(z.string(), z.string().max(META_MAX_VALUE_LENGTH))
  .refine((meta) => Object.keys(meta).length <= META_MAX_KEYS, {
    message: `meta allows at most ${META_MAX_KEYS} keys`,
  });

// Unknown keys, like the `date` older callers still send, are stripped
const webhookPayloadSchema = z.discriminatedUnion('success', [
  z.object({
    success: z.literal('ok'),
    gitLabJobId: z.string(),
    meta: metaSchema.optional(),
  }),
  z.object({
    success: z.literal('error'),
    error: z.string(),
  }),
]);

/**
 * Handles a backfill request.
 * @param request The request, with the ingest secret when one is set
 * @param deps The database to write to and the GitLab source to read from
 * @returns The ingested Job with its day, or the error with its status
 */
export async function handleBackfillRequest(
  request: Request,
  { db, source }: { db: typeof appDb; source: GitLabSource }
): Promise<Response> {
  const unauthorized = requireIngestAuth(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const validationResult = webhookPayloadSchema.safeParse(
      await request.json()
    );
    if (!validationResult.success) {
      return Response.json(
        {
          success: false,
          error: { code: 'INVALID_PAYLOAD', message: 'Invalid payload format' },
        },
        { status: 422 }
      );
    }

    if (validationResult.data.success === 'error') {
      return Response.json(
        {
          success: false,
          error: {
            code: 'WEBHOOK_ERROR',
            message: validationResult.data.error,
          },
        },
        { status: 422 }
      );
    }

    const { gitLabJobId, meta } = validationResult.data;
    // biome-ignore lint/suspicious/noConsole: logs who asked for the backfill, and why
    console.info('Backfill request', { gitLabJobId, meta });

    const snapshot = await source.fetchSnapshot(gitLabJobId);
    if (!snapshot.success) {
      return Response.json(
        { success: false, error: snapshot.error, meta },
        { status: 400 }
      );
    }

    const ingested = await ingestSnapshot(db, gitLabJobId, snapshot.data);
    if (!ingested.success) {
      return Response.json(
        { success: false, error: ingested.error, meta },
        {
          // ingestSnapshot returns only INGEST_SNAPSHOT_ERRORS codes
          status:
            INGEST_ERROR_STATUS[
              ingested.error.code as keyof typeof INGEST_SNAPSHOT_ERRORS
            ],
        }
      );
    }

    return Response.json({ success: true, data: ingested.data, meta });
  } catch (error) {
    const newError = handleError(error);
    console.error(newError);
    return new Response(`Webhook error: ${newError.message}`, {
      status: 500,
    });
  }
}
