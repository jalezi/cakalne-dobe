import { handleJobIngestionRequest } from './handle-job-ingestion-request';

export async function POST(request: Request) {
  const rawBody = await request.json();
  const result = await handleJobIngestionRequest(rawBody);

  if (!result.success) {
    console.error(result.error);
    return new Response(`Webhook error: ${result.error}`, { status: 202 });
  }

  return Response.json({ success: true, data: result.data });
}
