import type { db as appDb } from '@/db';
import { ingestSnapshot } from '@/snapshot';
import {
  INGEST_SNAPSHOT_ERRORS,
  type IngestedSnapshot,
  jobDay,
} from '@/snapshot/ingest';
import type { GitLabSource } from '@/snapshot/source';
import type { Result } from '@/types';
import { handleError } from '@/utils/handle-error';
import { validateWebhookPayload } from './validation';

export type AlreadyStored = {
  alreadyStored: true;
  gitLabJobId: string;
  /** Present when the Snapshot was downloaded */
  day?: string;
};

/**
 * Stores GitLab's latest `run` Job, unless a Job with its id or day is stored.
 * @param rawBody The webhook's request body
 * @param deps The database to write to and the GitLab source to read from
 * @returns The ingested Job, or `alreadyStored` when nothing was stored
 */
export async function handleJobIngestionRequest(
  rawBody: unknown,
  { db, source }: { db: typeof appDb; source: GitLabSource }
): Promise<Result<IngestedSnapshot | AlreadyStored>> {
  const validationResult = validateWebhookPayload(rawBody);
  if (!validationResult.success) {
    return { success: false, error: validationResult.error };
  }

  const latest = await source.latestRunJob();
  if (!latest.success) {
    return latest;
  }
  const { gitLabJobId } = latest.data;

  // Saves the download on the second daily call; ingestSnapshot enforces the rule
  try {
    const stored = await db.query.jobs.findFirst({
      columns: { id: true },
      where: (jobs, { eq }) => eq(jobs.gitLabJobId, gitLabJobId),
    });
    if (stored) {
      return { success: true, data: { alreadyStored: true, gitLabJobId } };
    }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'DB_QUERY_FAILED',
        message: `Database query error: ${handleError(error).message}`,
      },
    };
  }

  const snapshot = await source.fetchSnapshot(gitLabJobId);
  if (!snapshot.success) {
    return { success: false, error: snapshot.error };
  }

  const ingested = await ingestSnapshot(db, gitLabJobId, snapshot.data);
  if (!ingested.success) {
    if (ingested.error.code === INGEST_SNAPSHOT_ERRORS.JOB_EXISTS) {
      return {
        success: true,
        data: {
          alreadyStored: true,
          gitLabJobId,
          day: jobDay(snapshot.data.start),
        },
      };
    }
    return { success: false, error: ingested.error };
  }
  return { success: true, data: ingested.data };
}
