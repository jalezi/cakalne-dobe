# Cakalne Dobe - AI Assistant Instructions

## Project Overview

Cakalne Dobe is a Next.js 15 application tracking medical procedure waiting periods in Slovenia. It visualizes time-series data across medical institutions and procedures using Recharts with interactive controls.

## Architecture & Tech Stack

### Database (LibSQL/Turso + Drizzle)

- **Local**: `dev.db` file with `pnpm turso:dev:file`
- **Production**: Turso cloud database
- **Core schema** (composite primary keys for time-series):
  - `jobs`: Data collection timestamps (`start_date`, `end_date`, `git_lab_job_id`)
  - `waitingPeriods`: Main entity with triple PK (`job_id`, `institution_id`, `procedure_id`)
  - `institutions`: Medical facilities
  - `procedures`: Medical procedures with codes
  - `maxAllowedDays`: Regulatory limits per procedure

### Framework Stack

- **Next.js 15 App Router** with React Server Components
- **TurboPack** for development (`pnpm dev`)
- **shadcn/ui + TailwindCSS 4** for UI components
- **Recharts** for data visualization in `src/components/charts/`
- **Vitest + Testing Library** with jsdom environment

## Critical Development Patterns

### Data Flow Architecture

1. **Raw data**: JSON job files in `mock-data/jobs/` (massive files ~150k lines)
2. **Seeding**: `seed/seed-db.ts` prompts for source ('jobs' vs 'rows') and processes data
3. **Queries**: Server actions in `src/actions/` use complex Drizzle joins with aggregations
4. **Rendering**: Server components fetch data, client components handle interactions

### Database Patterns

```typescript
// Composite PKs are standard - waitingPeriods table
primaryKey: [table.jobId, table.institutionId, table.procedureId];

// Use Drizzle inferSelect/inferInsert for type safety
export type WaitingPeriod = typeof waitingPeriods.$inferSelect;

// SQL aggregations with cast for type safety
const average = (col) => sql<number>`cast(${avg(col)} as FLOAT)`;
```

### Server Action Pattern

```typescript
'use server';
// All data fetching uses server actions for complex queries
export async function getProcedureAvgWtForJob(params: Params) {
  return await db.select({...}).from(waitingPeriodsTable)...
}
```

## Essential Development Commands

### Database Operations

```bash
# Start local DB (required before development)
pnpm turso:dev:file

# Push schema changes
pnpm drizzle:local:push

# Browse data in Drizzle Studio
pnpm drizzle:local:studio

# Seed with interactive prompts
pnpm db:local:seed  # Choose 'jobs' (default) or 'rows'
```

### Development & Testing

```bash
pnpm dev           # Next.js with TurboPack
pnpm test          # Vitest with mocked database
pnpm lint          # ESLint (runs pre-build)
```

## Project-Specific Conventions

### Waiting Period Urgency Levels

Three urgency types tracked throughout codebase:

- `regular`: Standard waiting time
- `fast`: Expedited waiting time
- `veryFast`: Urgent waiting time

### Environment Configuration

- **Local**: `.env.development.local` with `DATABASE_URL` pointing to local file
- **Production**: `.env.production.local` with Turso credentials
- **Validation**: Zod schemas in `src/lib/env.ts` for type-safe env vars

### Testing Patterns

- Mock env module in tests: `vi.mock('@/lib/env', () => ({...}))`
- In-memory SQLite for test isolation
- Test fixtures in `src/db/test/` with setup/cleanup utilities

### Chart Components Architecture

- Server components fetch data via server actions
- Client components in `src/components/charts/wp/` handle interactivity
- Recharts with custom tooltip components and brush controls
- Time-series data with date range pickers and procedure filtering

## Key Files for Context

- **Schema**: `src/db/schema/index.ts` (exports all entities)
- **Main UI**: `src/app/page.tsx` (demonstrates server component data fetching)
- **Server Actions**: `src/actions/get-procedure-avg-wt-*.ts` (complex aggregation queries)
- **Seed Logic**: `seed/seed-db-from-jobs.ts` (JSON parsing and batch inserts)
- **Test Setup**: `test/setup.ts` and `src/db/test/` (database mocking patterns)

## Important

- **Do not write to database without proper validation and error handling.**
- **Always sanitize user inputs to prevent SQL injection attacks.**
- **Use transactions for complex write operations to maintain data integrity.**
- **Implement proper error handling and logging for all database operations.**
- **Regularly review and update database access permissions.**
- **Keep database schemas and migrations up to date.**
- **Document all database changes and maintain an up-to-date changelog.**
- **From chat Do not write to database unless user confirms.**

## Git

- Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/#specification) to create clear and consistent commit messages.
- Use descriptive commit messages that accurately reflect the changes made.
- Include issue references in commit messages (e.g., "Fixes #123").
- Keep commits small and focused on a single task or issue.
- Rebase commits to maintain a clean commit history.
- Squash related commits together to create a more coherent history.
- Avoid unnecessary merge commits by using rebase instead.
- Always pull the latest changes from the main branch before pushing new commits.
- Use feature branches for new development work.
- Delete branches after they have been merged to keep the repository clean.
- Regularly review and clean up stale branches.
