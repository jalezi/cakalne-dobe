# PRD: Ensure Local Database Has Last 3 Months of Data

## Introduction/Overview

Currently, the local development database seeding process uses JSON files from `mock-data/jobs/` but doesn't enforce a requirement for data recency. Developers may work with stale data that doesn't represent the last 3 months of waiting period information, which can lead to:
- Inaccurate testing of date-dependent features
- UI components rendering with outdated data
- Difficulty reproducing production issues related to recent data

This feature adds a mechanism to ensure the local database always contains data for the last 3 months, making development more consistent and production-like.

## Goals

1. Provide a manual command that ensures the local database contains data for the last 3 months
2. Validate that JSON source files cover the required 3-month period
3. Maintain historical data beyond 3 months while prioritizing recent data availability
4. Give developers clear visibility into data coverage and freshness
5. Preserve existing seeding functionality while adding data validation

## User Stories

1. **As a developer**, I want to run a single command to ensure my local database has the last 3 months of data, so that I can test features with recent, realistic data.

2. **As a developer**, I want to see clear console output showing the date range coverage in my database, so that I know whether I have sufficient data for testing.

3. **As a developer**, I want the system to warn me if the JSON files don't cover the full 3 months, so that I can take action to obtain more recent data files.

4. **As a developer**, I want to keep historical data beyond 3 months while ensuring recent data exists, so that I can test with a rich dataset without constantly reseeding.

5. **As a project maintainer**, I want a validation mechanism during seeding, so that team members always work with appropriately fresh data.

## Functional Requirements

### Core Functionality

1. **New Command**: Create a new npm script `pnpm db:ensure-fresh-data` that:
   - Checks if the local database has data covering the last 3 months
   - Seeds/updates the database if the requirement isn't met
   - Outputs validation results to the console

2. **Date Range Calculation**: Calculate the required 3-month period as:
   - End date: The most recent job date available in the JSON files
   - Start date: 3 months before the most recent job date
   - Example: If most recent job is Oct 7, 2024, require data from July 7, 2024 to Oct 7, 2024

3. **Data Validation Module**: Create a validation function that:
   - Scans the `mock-data/jobs/` directory for available JSON files
   - Extracts date information from filenames (format: `wp-YYYY-MM-DD-HH-MM-SS-*.json`)
   - Determines the date range covered by available files
   - Compares available range against the 3-month requirement

4. **Database Coverage Check**: Create a function that:
   - Queries the `jobs` table for the earliest and latest `start_date`
   - Calculates the current data coverage in the database
   - Returns coverage status (adequate/inadequate)

5. **Smart Seeding Strategy**: Implement logic that:
   - Keeps all existing data in the database (historical preservation)
   - Only seeds missing jobs/dates that fall within the required 3-month window
   - Avoids duplicate job entries (check by `git_lab_job_id`)

6. **Console Reporting**: Provide detailed output including:
   - Current database date range coverage
   - Required 3-month date range
   - Available JSON files date range
   - Status: ✓ Adequate coverage / ⚠️ Missing data / ✗ Insufficient source files
   - List of JSON files that will be seeded (if applicable)

7. **Warning System**: If JSON files don't cover the full 3 months:
   - Display clear warning message
   - Show the gap (e.g., "Missing data for Aug 15 - Sept 1")
   - Proceed with seeding available data
   - Exit with warning status code (but don't fail hard)

### Integration Points

8. **Enhance Existing Seed Script**: Modify `seed/seed-db.ts` to:
   - Add a validation step before seeding
   - Show data coverage report after seeding completes

9. **Helper Module**: Create `seed/seed-helpers/validate-data-coverage.ts` with:
   - `getAvailableJobsDateRange()`: Scans JSON files and returns date range
   - `getDatabaseDateRange()`: Queries database for current coverage
   - `validateThreeMonthRequirement()`: Checks if requirement is met
   - `getJobsToSeed()`: Returns list of JSON files needed for 3-month coverage

10. **Configuration**: Add to environment or config:
    - `REQUIRED_MONTHS_COVERAGE`: Default to 3, but configurable
    - Option to make validation strict (fail on insufficient data) or permissive (warn only)

## Non-Goals (Out of Scope)

1. **Automatic data fetching**: This feature does NOT automatically download new JSON files from external sources or production
2. **Synthetic data generation**: Will not create fake/mock data to fill gaps
3. **Production database**: This feature is for local development only, not Turso production database
4. **Automatic scheduling**: Will not run automatically on `pnpm dev` or as a cron job (manual command only)
5. **Data cleanup**: Will not delete old data beyond 3 months (keeps historical data)
6. **Migration handling**: Does not handle schema migrations or database structure changes

## Design Considerations

### Console Output Example

```
📊 Checking Local Database Data Coverage...

Database Coverage:
  Earliest: 2024-06-15
  Latest:   2024-10-07
  Span:     ~4 months

Required Coverage (last 3 months from most recent job):
  Required Start: 2024-07-07
  Required End:   2024-10-07

Available JSON Files:
  📁 mock-data/jobs/wp-2024-06-07-05-12-11-7041049865.json
  📁 mock-data/jobs/wp-2024-07-15-09-30-45-7041049866.json
  📁 mock-data/jobs/wp-2024-08-22-14-20-10-7041049867.json
  📁 mock-data/jobs/wp-2024-10-07-11-05-33-7041049868.json

Status: ✓ Database has adequate coverage for the last 3 months

Historical data preserved: Data from 2024-06-15 retained for reference.
```

### Error State Example

```
⚠️  Warning: Incomplete Data Coverage

Database Coverage:
  Earliest: 2024-08-01
  Latest:   2024-09-15

Required Coverage:
  Required Start: 2024-07-07
  Required End:   2024-10-07

Issues Found:
  ⚠️  Missing recent data: Sept 16 - Oct 07 (22 days)
  ⚠️  Gap in coverage: July 07 - July 31 (24 days)

Available source files cover only: 2024-08-01 to 2024-09-15

Action: Seeding all available data...
Recommendation: Obtain more recent JSON files to complete coverage.
```

## Technical Considerations

### Dependencies

- Use existing Drizzle ORM queries for database operations
- Leverage Node.js `fs` module for scanning `mock-data/jobs/` directory
- Use `date-fns` (if already in project) or native `Date` for date calculations

### File Structure

```
seed/
  seed-helpers/
    validate-data-coverage.ts    # New validation module
    date-range-calculator.ts     # New date utility module
```

### Database Queries Needed

```typescript
// Get database date range
const [result] = await db
  .select({
    earliest: sql<string>`MIN(${jobsTable.startDate})`,
    latest: sql<string>`MAX(${jobsTable.startDate})`
  })
  .from(jobsTable);

// Check if specific job exists
const existingJob = await db
  .select()
  .from(jobsTable)
  .where(eq(jobsTable.gitLabJobId, jobId))
  .limit(1);
```

### Date Calculation Logic

```typescript
// Calculate 3 months before most recent job
const mostRecentDate = new Date('2024-10-07');
const threeMonthsAgo = new Date(mostRecentDate);
threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
```

### Integration with Existing Seed Process

The new command should wrap/extend the existing seed flow:
1. Run validation check
2. Determine which files need seeding
3. Call existing `seedDbFromJobs()` with filtered file list
4. Display post-seed coverage report

## Success Metrics

1. **Developer Experience**: Developers can verify data freshness in <5 seconds
2. **Data Quality**: 100% of developers working with local database have last 3 months of data
3. **Visibility**: Console output clearly shows coverage status every time command runs
4. **Reliability**: Command successfully identifies and fills data gaps 95%+ of the time
5. **Performance**: Validation check completes in <2 seconds for typical workspace

## Acceptance Criteria

- [ ] New command `pnpm db:ensure-fresh-data` exists and is documented
- [ ] Command scans JSON files and extracts date information correctly
- [ ] Command queries database and determines current coverage
- [ ] Command calculates 3-month requirement based on most recent job date
- [ ] Console output shows clear, formatted coverage status
- [ ] Warning displayed when JSON files don't cover full 3 months
- [ ] Command seeds only missing data (preserves existing data)
- [ ] Command avoids duplicate job entries
- [ ] Historical data beyond 3 months is retained
- [ ] README.md updated with new command and its purpose
- [ ] Validation module has unit tests covering edge cases

## Open Questions

1. Should we add a `--strict` flag that fails hard if 3-month coverage can't be achieved?
2. Should the command have a `--dry-run` flag to show what would be seeded without actually doing it?
3. Should we create a dashboard endpoint (e.g., `/api/data-coverage`) for viewing coverage in the browser?
4. Should we add automated tests that verify data coverage in CI/CD?
5. What should happen if `mock-data/jobs/` directory is empty?
6. Should we support configuration to change the required months (e.g., via env var)?

## Implementation Notes for Developer

### Suggested Approach

1. **Phase 1**: Create validation module
   - Build `validate-data-coverage.ts` with core validation functions
   - Add unit tests for date parsing and range calculations

2. **Phase 2**: Implement database coverage check
   - Add query to get database date range
   - Create comparison logic against requirements

3. **Phase 3**: Build console reporting
   - Design clear output format
   - Add colored terminal output (consider `chalk` if available)

4. **Phase 4**: Create smart seeding logic
   - Filter JSON files to only those needed
   - Integrate with existing seed functions
   - Add duplicate prevention

5. **Phase 5**: Add command and documentation
   - Update `package.json` with new script
   - Document in README.md
   - Add examples and troubleshooting guide

### Testing Checklist

- [ ] Empty database scenario
- [ ] Database with adequate coverage (no seeding needed)
- [ ] Database with old data only (needs recent data)
- [ ] Database with gaps in coverage
- [ ] No JSON files available
- [ ] JSON files cover less than 3 months
- [ ] JSON files cover exactly 3 months
- [ ] JSON files cover more than 3 months

---

**Document Version**: 1.0  
**Created**: October 19, 2025  
**Status**: Ready for Implementation
