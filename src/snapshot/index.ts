import type { AllData } from '@/lib/zod-schemas/data-schemas';
import type { Result } from '@/types';
import { createHttpGitLabSource, type GitLabSourceMeta } from './source';

export { ingestSnapshot } from './ingest';

export async function fetchSnapshot(
  gitLabJobId: string
): Promise<Result<AllData, GitLabSourceMeta>> {
  return createHttpGitLabSource().fetchSnapshot(gitLabJobId);
}
