import { db } from '@/db';
import { createHttpGitLabSource } from '@/snapshot/source';
import { handleBackfillRequest } from './handle-backfill-request';

export function POST(request: Request) {
  return handleBackfillRequest(request, {
    db,
    source: createHttpGitLabSource(),
  });
}
