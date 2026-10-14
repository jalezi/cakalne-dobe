This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Database Operations

This project uses LibSQL/Turso for the database with Drizzle ORM. The database stores medical procedure waiting period data for institutions in Slovenia.

### Database Setup

Start the local database (required before development):

```bash
pnpm turso:dev:file
```

This starts a local Turso database instance using the `dev.db` file.

### Fetching Job Artifacts from GitLab

Download job artifacts from the GitLab CI/CD pipeline:

```bash
# Fetch 10 latest jobs (default)
pnpm fetch:jobs

# Fetch specific number of jobs
pnpm fetch:jobs --count 20

# Fetch jobs from specific date
pnpm fetch:jobs --from-date 2024-03-01

# Save to custom directory
pnpm fetch:jobs --output ./custom/path
```

The script:
- Queries GitLab GraphQL API for job list
- Downloads artifacts from GitLab Pages
- Saves files as `mock-data/jobs/wp-YYYY-MM-DD-HH-MM-SS-{JOB_ID}.json`
- Handles errors gracefully (many jobs don't have artifacts)
- Provides progress feedback with success/error counts

**Note:** Only successfully completed CI/CD jobs have artifacts available. Failed or running jobs will be skipped with error messages.

### Seeding the Database

#### Full Seed (Interactive)

Interactive seeding with options to delete tables and choose data source:

```bash
# Local database
pnpm db:local:seed

# Production database
pnpm db:prod:seed
```

#### Ensure Fresh Data (Automatic)

Automatically checks database coverage and seeds missing data to maintain the last 3 months of records:

```bash
# Local database
pnpm db:local:ensure-fresh-data

# Production database
pnpm db:prod:ensure-fresh-data
```

**What it does:**
1. Displays current database coverage (date range, job count)
2. Scans available job files in `mock-data/jobs/`
3. Validates that data covers the last 3 months
4. Identifies missing jobs
5. Seeds only new jobs (skips existing ones)
6. Shows before/after comparison

**Example output (adequate coverage):**

```
═══════════════════════════════════════════════════════
📊 Checking Local Database Data Coverage...
═══════════════════════════════════════════════════════

🗄️  Local File Database (dev.db)
🔗 file:./dev.db

📊 Current Database Coverage
✓ Jobs in database: 15
  Earliest: 2024-04-07
  Latest: 2024-06-07
  Days covered: 61

📅 Required Coverage (Last 3 Months)
  Required from: 2024-03-07
  Required to: 2024-06-07
  Days required: 92

📁 Available Job Files
✓ Found 17 job file(s)
  Earliest: 2024-04-07
  Latest: 2024-06-07

🔍 Validation Status
✓ Coverage is adequate - meets 3-month requirement

✅ No files to seed - coverage is up to date!
```

**Example output (needs seeding):**

```
═══════════════════════════════════════════════════════
📊 Checking Local Database Data Coverage...
═══════════════════════════════════════════════════════

🗄️  Local File Database (dev.db)
🔗 file:./dev.db

📊 Current Database Coverage
⚠️ No data found in database
  Database is empty

🔧 Checking for missing data...
   Found 17 file(s) within required date range

🌱 Starting smart seeding process...
   Processing 17 file(s) (skipping existing jobs)

  ✨ Seeding new job: 7041049865
  ✨ Seeding new job: 6999039083
  ...

✨ Seeding Complete
  ✓ Successfully seeded: 15
  ℹ Skipped (existing): 2
  ✗ Errors encountered: 0

📊 Database Coverage Update:
   Before: 0 jobs | N/A - N/A
   After:  15 jobs | 2024-04-07 - 2024-06-07

✅ Data coverage check completed successfully!
```

### 3-Month Data Requirement

The system ensures the local database maintains **at least 3 months of historical data** from the most recent job:

- **Required range**: Latest date minus 3 months to latest date
- **Date calculation**: Uses `date-fns` `subMonths()` for accuracy (handles month boundaries, leap years)
- **File parsing**: Extracts dates from job filenames (format: `wp-YYYY-MM-DD-HH-MM-SS-*.json`)
- **Smart seeding**: Only adds missing jobs, preserves existing data

### Troubleshooting

**No job files found**
```
❌ No job files found in mock-data/jobs/
```
→ Ensure job JSON files exist in the `mock-data/jobs/` directory

**Could not determine date range**
```
❌ Could not determine date range from available files
```
→ Check that job filenames follow the pattern: `wp-YYYY-MM-DD-HH-MM-SS-*.json`

**Database connection errors**
→ Ensure the local database is running (`pnpm turso:dev:file`) and `.env.development.local` has correct `DATABASE_URL`

**Coverage is inadequate**
```
✗ Coverage is inadequate - missing required data
  ⚠️ Missing 45 days of data before 2024-05-01
```
→ The script will automatically seed the missing data. Check `mock-data/jobs/` for files in the required date range.

### Database Schema Management

```bash
# Push schema changes to local database
pnpm drizzle:local:push

# Push schema changes to production database
pnpm drizzle:prod:push

# Open Drizzle Studio to browse local database
pnpm drizzle:local:studio

# Open Drizzle Studio to browse production database
pnpm drizzle:prod:studio
```

### Historical Data Preservation

- The `ensure-fresh-data` command **never deletes** existing data
- It only adds missing jobs from the required 3-month window
- Older data beyond 3 months is preserved unless manually deleted
- Use `db:local:seed` with "delete tables" option for a clean slate

## Code health

CI runs `fallow health` with measured test coverage. It fails when a function crosses a complexity threshold (by default cyclomatic > 20, cognitive > 15 or CRAP ≥ 30) and isn't in the committed baseline, `fallow-health-baseline.json`. The baseline is saved in identity mode: each entry is a file path plus a function name, with its severity. It holds complexity findings only, not refactoring targets.

The baseline is shrink-only. CI also fails when the PR's baseline has a key that the base branch's baseline doesn't have. A key is one function identity in one severity category, such as `crap_high`. These count as growth:

- a new function over a threshold
- a baselined function whose severity changes, up or down
- a renamed or moved baselined function
- a second finding in the same category for an existing identity, such as another unnamed function in the same file

Removing an entry is never growth.

Run the gate locally:

```bash
pnpm test:coverage
git fetch origin main
pnpm exec fallow health --coverage coverage/coverage-final.json --baseline fallow-health-baseline.json --baseline-mode identity --fail-on-baseline-growth --baseline-base origin/main
```

Re-save the baseline with `pnpm fallow:health:baseline`, which runs the tests with coverage, saves the baseline and formats it with Biome. Re-save it:

- after fixing a baselined function, to drop its stale entry
- after renaming or moving a baselined function, which otherwise counts as a new finding
- after deliberately making a baselined function worse, since a higher severity fails the gate
- after a fallow version bump

Only the first is a pure removal. The others can add keys, and a PR that grows the baseline needs the `baseline-growth-ok` label. Only the maintainer adds the label; agents never do. Adding or removing it re-runs `verify`. While the PR has it, CI skips the growth check on every push, but a finding missing from the baseline still fails. A partly improved function, say from `crap_high` to `crap_moderate`, still passes against its old entry. Re-saving it records the lower severity as a new key, which needs the label too. Never re-save the baseline just to turn a red check green.

Unnamed functions in one file share one baseline identity. fallow names an arrow function after the `const` it's assigned to, so this only affects inline callbacks, such as the one baselined in `scripts/cleanup-vercel-prod.ts`. If you fix a baselined unnamed function and then add a new unnamed one over a threshold in the same file before re-saving, the new one takes the old one's slot and the gate passes. Re-saving the baseline right after the fix closes that gap.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
