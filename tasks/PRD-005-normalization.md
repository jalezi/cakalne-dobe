# PRD: Enforce Data Normalization at Schema Layer

## Candidate
#5 — Normalization Enforced Only at Ingestion Time

## Problem Statement

Facility name trimming and dash-normalization live only in `src/snapshot/transformer.ts`. The database schema has **no constraint**; a direct insert or alternate ingestion path bypasses it.

The key format in `SnapshotInsertPayload` Maps — `${trimmedFacility}-${procedure.code}` — is **undocumented**. Brittle to change; risky to assume in new code paths.

**Deletion test:** Remove transformer normalization. Duplicates appear silently. New seeding paths, manual inserts, or API endpoints that skip the transformer introduce unnormalized data.

## Solution

Push normalization to the **schema/insert boundary**. Options:

### Option A: Drizzle Hooks (Recommended)
```typescript
export const institutions = sqliteTable('institutions', {
  name: text('name')
    .notNull()
    .$defaultFn(() => trimAndNormalize(name)), // Hook or computed
});
```

### Option B: Insert Wrapper Function
```typescript
export function normalizeInstitutionName(name: unknown): string {
  return trimmedStringSchema.parse(name);
}

// Used everywhere
const normalized = normalizeInstitutionName(facility);
db.insert(institutions).values({ name: normalized });
```

### Option C: Database Constraint + Comment
Document the rule: "institution.name must be trimmed and normalized." Add a database comment or check constraint.

**Recommended: Option B** — explicit, testable, language-level control without ORM magic.

Also: document `SnapshotInsertPayload` key format explicitly. The `${facility}-${procedure}` pattern should be defined once and reused.

## Benefits

### Locality
Normalization rule lives at the insert boundary, enforced for **all paths** — transformer, direct inserts, seeding, APIs.

### Leverage
Transformer becomes simpler; callers don't need to know about trimming. New ingestion sources inherit normalization for free.

### Correctness
Duplicates can't sneak in through backdoor inserts. The schema/insert layer is the enforcement point.

## Success Criteria

1. `normalizeInstitutionName(input: unknown): string` function exists and is tested
2. All insert paths use it: transformer, seed, direct API inserts
3. Transformer calls `normalizeInstitutionName()` instead of inline `trimmedStringSchema`
4. `SnapshotInsertPayload` keys documented: `"${normalizeInstitutionName(facility)}-${procedure.code}"`
5. Schema or insert layer validates trimmed name (length, pattern, etc.)
6. Tests verify:
   - Whitespace-padded names → trimmed
   - Multi-space collapses (if applicable)
   - Duplicate normalized names detected
7. No untrimmed names in database after seeding

## Implementation Approach

1. Create `src/db/schema/institution-normalization.ts`:
   - Export `normalizeInstitutionName(input: unknown): string`
   - Uses `trimmedStringSchema` + any other rules
   - Test separately
2. Update `src/snapshot/transformer.ts`:
   - Import and use `normalizeInstitutionName()` instead of inline calls
3. Export normalized key format from a constant:
   ```typescript
   export function snapshotInsertPayloadKey(
     facility: string,
     procedureCode: string
   ): string {
     return `${normalizeInstitutionName(facility)}-${procedureCode}`;
   }
   ```
4. Update all Map key creation to use this function
5. Add comprehensive tests in `test/institution-normalization.test.ts`
6. Seed code uses the normalization function where needed

## Estimated Effort
Small — extraction of normalization logic, documentation, test coverage. Mostly straightforward.

## Related Documents
- Architectural Review: #4 Error Types (completed) ✓
- Related: #2 Snapshot Pipeline Seam (uses normalized keys)
- Related: #3 Ingestion Handler (all insert paths pass through)

## Dependencies
- #4 Error types (done) ✓
- Independent otherwise — can be done in parallel with #1, #2
