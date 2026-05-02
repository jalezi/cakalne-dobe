# PRD: Make Snapshot Pipeline Seam Testable

## Candidate
#2 — Hardwired Snapshot Pipeline (hypothetical seam)

## Problem Statement

`src/snapshot/source.ts` defines a clean `SnapshotSource` interface — that's a seam in theory. But `src/snapshot/index.ts` **hard-codes** `createHttpSnapshotSource()` in the exported `fetchAndPrepareSnapshot()`.

**One adapter means a hypothetical seam.** The interface exists, but tests cannot inject an alternate source without mocking global `fetch()`. The `createInMemorySnapshotSource()` exists but is orphaned — no way to use it in the real pipeline.

The pipeline itself is **not testable in isolation** from HTTP; understanding how transformer failures propagate requires a full mock setup.

## Solution

Make `fetchAndPrepareSnapshot()` accept an optional source parameter with HTTP as the sensible default.

```typescript
export async function fetchAndPrepareSnapshot(
  gitLabJobId: string,
  source?: SnapshotSource
): Promise<Result<PreparedSnapshot, SnapshotPipelineMeta>> {
  const resolvedSource = source ?? createHttpSnapshotSource();
  return fetchAndPrepareSnapshotFromSource(gitLabJobId, resolvedSource);
}
```

Now tests can inject `createInMemorySnapshotSource()` or mock sources without touching `fetch()`.

## Benefits

### Locality
Snapshot pipeline logic concentrated at the interface (`fetchAndPrepareSnapshot`), not scattered across test setup and HTTP stubs.

### Leverage
Existing in-memory source becomes *actually useful* — not dead code. Tests become explicit about what they're testing: transformer logic vs. source fetching.

### Seam Becomes Real
Two adapters (HTTP + in-memory) = real seam. Opens door to file sources, API caching, etc. without changing the pipeline.

## Success Criteria

1. `fetchAndPrepareSnapshot(jobId, source?)` accepts optional source parameter
2. Default to HTTP source in production calls
3. Seed code can pass `createInMemorySnapshotSource()` for bulk operations
4. No more global `fetch` mocks in `snapshot.test.ts` — use in-memory source instead
5. `snapshot-source.test.ts` tests both HTTP and in-memory adapters
6. All tests pass, HTTP fetch count in tests reduced to zero

## Implementation Approach

1. Modify `src/snapshot/index.ts`:
   - Add `source?: SnapshotSource` parameter to `fetchAndPrepareSnapshot()`
   - Default to HTTP if not provided
2. Update `src/app/api/v1/insert-new-job-data/handle-job-ingestion-request.ts`:
   - Call `fetchAndPrepareSnapshot(jobId)` (no change — still uses HTTP)
3. Update `seed/ingest-snapshot.ts`:
   - Pass in-memory source for bulk seeding if available
4. Rewrite `test/snapshot.test.ts`:
   - Remove global `fetch` mocks
   - Create test data with `createInMemorySnapshotSource()`
   - Use that as the source parameter
5. Verify `test/snapshot-source.test.ts` covers both adapters

## Estimated Effort
Small — straightforward parameter addition, test refactoring to use in-memory adapter.

## Related Documents
- Architectural Review: #4 Error Types (completed) ✓
- Depends on: #1 GitLab Client (independent, but good to do first)
- Related: #5 Normalization

## Dependencies
- Clean error types from #4 (already done) ✓
