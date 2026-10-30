# PRD: Collapse Ingestion Handler into Deep Module

## Candidate

#3 — Ingestion Handler is an Orchestration Skeleton (no locality)

## Problem Statement

Job ingestion is decomposed into 5 files:
- `handle-job-ingestion-request.ts` — orchestrates by calling one function from each sibling
- `job-processing.ts` — checks if job should insert, calls GitLab, calls snapshot prep
- `db-operations.ts` — transaction logic, batch inserts per table
- `validation.ts` — schema validation
- `types.ts` — type aliases

Understanding the pipeline requires reading across 5 files. `handle-job-ingestion-request.ts` does almost nothing except call functions in order — **pure orchestration with no behaviour**.

**Deletion test:** Remove the handler. Zero complexity concentrated there vanishes. Tests mock _every_ import, testing "did it call X then Y" rather than "did it insert correctly".

## Solution

Collapse into a single **`JobIngestion`** module with one deep seam:

```typescript
export const ingestJob(
  webhookPayload: unknown,
  deps?: Partial<JobIngestionDeps>
): Promise<Result<IngestionResult, IngestionMeta>>
```

Internal implementation owns:
- Payload validation
- Dedup checks (is job already in DB?)
- GitLab fetch orchestration
- Snapshot preparation
- Transaction execution and batching
- Error categorization and reporting

Only `validation.ts` stays separate — it's a true **input seam** (the parsed payload schema is the contract).

## Benefits

### Locality

Entire ingestion pipeline lives in one place. Want to change error handling? One file. Add a check? One file. Reorder steps? One file.

### Leverage

Test through the single `ingestJob()` interface with injected `deps` instead of mocking 6 modules:

```typescript
const result = await ingestJob(payload, {
  gitLabClient: mockGitLabClient,
  db: testDb,
  snapshotSource: inMemorySource,
});

expect(result.success).toBe(true);
expect(result.data.inserted).toBeGreaterThan(0);
```

### Simplicity

Eliminates brittle "call order" tests. Tests verify _correctness_, not internal plumbing.

## Success Criteria

1. Single `src/app/api/v1/insert-new-job-data/ingestion.ts` exports `ingestJob(payload, deps?)`
2. Injected deps: `{ db?, gitLabClient?, snapshotSource?, logger? }`
3. Internal impl does all current steps: validate → dedup check → fetch → prepare → insert
4. `handle-job-ingestion-request.ts` becomes a thin HTTP adapter: parse body → call `ingestJob()` → return result
5. Tests mock only the truly external deps (GitLab, DB) — not intermediate orchestration
6. All tests pass
7. Old job-processing.ts, db-operations.ts deletable or reduced to helpers
8. Validation.ts stays (it's a real seam)

## Implementation Approach

1. Create `src/app/api/v1/insert-new-job-data/ingestion.ts`:
   - Define `JobIngestionDeps` interface
   - Implement `ingestJob(payload, deps?)` with all internal logic
   - Export `INGESTION_ERRORS` constants
2. Refactor `handle-job-ingestion-request.ts`:
   - Remove orchestration logic
   - Just: parse body → call `ingestJob()` → HTTP response
3. Move helper functions from `job-processing.ts` into `ingestion.ts` or make them internal
4. Move transaction logic from `db-operations.ts` into `ingestion.ts` or wrap it
5. Rewrite `test/handle-job-ingestion-request.test.ts`:
   - Create fewer mocks (deps vs. 6 individual mocks)
   - Test the actual ingestion logic flow, not call order
   - Use real testDb if possible
6. Delete or deprecate old files

## Estimated Effort

Large — significant refactoring, careful dependency injection setup, comprehensive test rewrite.

## Related Documents

- Architectural Review: #4 Error Types (completed) ✓
- Depends on: #1 GitLab Client (produces clean interface)
- Depends on: #2 Snapshot Pipeline Seam (injectable source)
- Related: #5 Normalization

## Dependencies

- #4 Error types (done) ✓
- #1 GitLab Client (needs deep interface)
- #2 Snapshot Pipeline Seam (needs injectable source)
