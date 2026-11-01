import { db } from '@/db';
import { requireIngestAuth } from '@/lib/ingest-auth';
import { createHttpGitLabSource } from '@/snapshot/source';
import { handleJobIngestionRequest } from './handle-job-ingestion-request';

export async function POST(request: Request) {
  const unauthorized = requireIngestAuth(request);
  if (unauthorized) {
    return unauthorized;
  }

  const rawBody = await request.json();
  const result = await handleJobIngestionRequest(rawBody, {
    db,
    source: createHttpGitLabSource(),
  });

  // 202, not an error status: Mitar's wget must never fail
  if (!result.success) {
    console.error(result.error);
    return new Response(`Webhook error: ${result.error.message}`, {
      status: 202,
    });
  }

  if ('alreadyStored' in result.data) {
    // biome-ignore lint/suspicious/noConsole: the second daily call is expected, not an error
    console.info('Latest Job already stored', result.data);
  }
  return Response.json({ success: true, data: result.data });
}
