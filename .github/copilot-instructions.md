# Cakalne Dobe - AI Assistant Instructions

## Project Overview
Cakalne Dobe is a Next.js application for tracking and visualizing waiting periods for medical procedures in Slovenia. The app collects, processes, and displays waiting time data across different medical institutions and procedures.

## Architecture

### Database
- Uses **LibSQL/Turso** (SQLite-compatible) database with Drizzle ORM
- Two database environments: `dev.db` (local) and `prod.db` (production)
- Core schema entities:
  - `jobs`: Represents data collection events with timestamps
  - `institutions`: Medical facilities
  - `procedures`: Medical procedures with codes
  - `waitingPeriods`: Core data entity linking jobs, institutions, and procedures with waiting times
  - `maxAllowedDays`: Maximum allowed waiting days for procedures

### Framework & UI
- Next.js 15 App Router architecture
- Server components for data fetching (see `src/app/page.tsx`)
- TailwindCSS with shadcn/ui components
- React Charts for data visualization in `src/components/charts`

## Development Workflow

### Setup & Environment
```bash
# Install dependencies
pnpm install

# Start development server with TurboPack
pnpm dev

# Start Turso dev database
pnpm turso:dev:file
```

### Database Operations
```bash
# Apply schema changes to local DB
pnpm drizzle:local:push

# Start Drizzle Studio to view/edit local DB
pnpm drizzle:local:studio

# Seed database from job files (default)
pnpm db:local:seed
# Use 'jobs' (default) or 'rows' as source when prompted
```

### Testing
```bash
# Run Vitest tests
pnpm test
```

## Project Conventions

### Data Flow Pattern
1. Data is collected in job files (JSON) stored in `mock-data/jobs`
2. Seed scripts in `seed/` parse and insert this data into the database
3. Server components in `src/app` fetch data using Drizzle queries
4. Server actions in `src/actions` handle complex data operations

### Key Files to Reference
- Database schema: `src/db/schema/*.ts`
- Server actions: `src/actions/*.ts`
- Main page component: `src/app/page.tsx`
- Chart components: `src/components/charts/`

### TypeScript Practices
- Use Drizzle's `$inferSelect` and `$inferInsert` for schema type safety
- Use Zod for environment variables and API validation
- Server/client boundaries maintained by 'use server' directives

## Important Concepts

### Waiting Period Types
Three levels of urgency are tracked:
- `regular`: Standard waiting time
- `fast`: Expedited waiting time
- `veryFast`: Urgent waiting time

### Job-based Data Collection
Each data point is associated with a "job" representing when the data was collected, enabling time-series analysis.

### Seeds vs Rows Data Sources
Two data sourcing approaches:
- `jobs`: Data from job files (preferred)
- `rows`: Legacy data format
