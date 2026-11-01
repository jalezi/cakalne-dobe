import type { AllData } from '@/lib/zod-schemas/data-schemas';
import type { Result } from '@/types';
import { createHttpSnapshotSource, type SnapshotSourceMeta } from './source';

export { ingestSnapshot } from './ingest';

export async function fetchSnapshot(
  gitLabJobId: string
): Promise<Result<AllData, SnapshotSourceMeta>> {
  return createHttpSnapshotSource().fetchSnapshot(gitLabJobId);
}
