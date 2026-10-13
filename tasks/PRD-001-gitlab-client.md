# PRD: Consolidate GitLab Client Module

## Candidate
#1 — Fragmented GitLab Client (pass-through utils)

## Problem Statement

Currently, GitLab API communication is scattered across three single-function modules:
- `src/utils/get-jobs.ts` wraps `graphQLClient.request()` 
- `src/utils/get-last-job-id.ts` wraps `getJobs()` and extracts ID
- `src/utils/get-json.ts` wraps `fetch()` and validates with schema

Each is a **pass-through** — they add no new behaviour, merely delegate to a single call. The real behaviour (auth, GraphQL execution, error handling, rate limits) lives nowhere as concentrated knowledge; it's scattered by absence.

**Deletion test:** Remove all three modules. Complexity reappears in every caller needing GitLab communication. The modules themselves added zero leverage.

## Solution

Create a single **`GitLabClient`** module with a deep interface:
- `getLatestJobId(first?: number, after?: string)` — fetch latest job metadata with pagination
- `getJobArtifact(jobId: string)` — fetch raw JSON artifact for a job

All auth, GraphQL setup, pagination logic, error handling hidden behind these two methods.

### Interface Design

```typescript
export const GITLAB_ERRORS = {
  FETCH_FAILED: 'FETCH_FAILED',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  PARSE_ERROR: 'PARSE_ERROR',
} as const;

export interface GitLabClientMeta {
  nodes?: number;
  pageInfo?: { endCursor: string; hasNextPage: boolean };
  error?: string;
}

export interface GitLabClient {
  getLatestJobId(
    first?: number,
    after?: string
  ): Promise<Result<{ gitLabJobId: string; jobFinishedAt: string }, GitLabClientMeta>>;
  
  getJobArtifact(jobId: string): Promise<Result<AllData, GitLabClientMeta>>;
}

export function createGitLabClient(): GitLabClient {
  return { /* implementation */ };
}
```

## Benefits

### Locality
All GitLab communication changes in one place. Token refresh, pagination, rate-limit handling — one module to update.

### Leverage
Callers express intent, not mechanism:
- `gitLabClient.getLatestJobId()` not `graphQLClient.request() + nodes[0].id`
- `gitLabClient.getJobArtifact(id)` not `fetch(url) + json() + validate()`

### Testability
Real seam emerges: in-memory adapter for tests (GitLab API never called in CI).

## Success Criteria

1. All three current modules (`get-jobs.ts`, `get-last-job-id.ts`, `get-json.ts`) removed or converted to thin wrappers around the new client
2. `createGitLabClient()` used in production paths
3. In-memory adapter (`createInMemoryGitLabClient()`) available for tests
4. No direct `fetch()` or `graphQLClient.request()` calls outside the client module
5. Tests for `getLatestJobId` and `getJobArtifact` pass
6. No new client module entry point calls legacy utils

## Implementation Approach

1. Create `src/lib/gitlab-client.ts` with `GitLabClient` interface and factory
2. Implement `createGitLabClient()` using existing GraphQL setup + auth
3. Implement `createInMemoryGitLabClient()` for tests
4. Replace imports in:
   - `src/app/api/v1/get-latest-gitlab-job-id/route.ts`
   - `src/app/api/v1/insert-new-job-data/job-processing.ts`
5. Delete or deprecate old utils
6. Update tests to use in-memory adapter

## Estimated Effort
Medium — consolidation of three files, refactoring two call sites, test coverage.

## Related Documents
- Architectural Review: #4 Error Types (completed)
- Next: #2 (Snapshot Pipeline Seam) depends on solid error handling ✓
