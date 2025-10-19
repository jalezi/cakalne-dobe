# Task List: Ensure Local Database Has Last 3 Months of Data

Based on PRD: `prd-ensure-three-months-data.md`

## Relevant Files

- `seed/seed-helpers/validate-data-coverage.ts` - New module containing validation functions for data coverage checks.
- `seed/seed-helpers/validate-data-coverage.test.ts` - Unit tests for validation module.
- `seed/seed-helpers/date-range-calculator.ts` - New utility module for date calculations and range operations.
- `seed/seed-helpers/date-range-calculator.test.ts` - Unit tests for date calculation utilities.
- `seed/ensure-fresh-data.ts` - New entry point script for the `pnpm db:ensure-fresh-data` command.
- `seed/seed-db-from-jobs.ts` - Existing seed script that needs enhancement for smart seeding logic.
- `seed/seed-db.ts` - Existing main seed script that needs validation integration.
- `seed/seed-helpers/index.ts` - Existing helper exports that need to include new validation functions.
- `seed/seed-helpers/get-data-from-file.ts` - Existing file reading logic that may need date extraction enhancement.
- `package.json` - Add new npm script for the command.
- `README.md` - Documentation for the new feature and command.

### Notes

- Unit tests should be placed alongside the code files they are testing (e.g., `validate-data-coverage.ts` and `validate-data-coverage.test.ts` in the same directory).
- Use `pnpm test` to run all tests via Vitest.
- Follow existing patterns in `seed/seed-helpers/` for error handling and console output.
- The project uses Drizzle ORM for database operations and `date-fns` for date manipulation.

## Tasks

- [x] 1.0 Create Date Range Calculator Utility Module
  - [x] 1.1 Create `seed/seed-helpers/date-range-calculator.ts` file
  - [x] 1.2 Implement `calculateThreeMonthsBack(fromDate: Date): Date` function that subtracts 3 months from a given date
  - [x] 1.3 Implement `formatDateForDisplay(date: Date): string` function to format dates consistently (e.g., "YYYY-MM-DD")
  - [x] 1.4 Implement `extractDateFromJobFilename(filename: string): Date | null` function to parse dates from JSON filenames (format: `wp-YYYY-MM-DD-HH-MM-SS-*.json`)
  - [x] 1.5 Implement `calculateDateDifference(startDate: Date, endDate: Date): number` function to calculate days between two dates
  - [x] 1.6 Implement `isWithinRange(date: Date, startDate: Date, endDate: Date): boolean` function to check if a date falls within a range
  - [x] 1.7 Export all functions with proper TypeScript types

- [x] 2.0 Create Data Coverage Validation Module
  - [x] 2.1 Create `seed/seed-helpers/validate-data-coverage.ts` file
  - [x] 2.2 Implement `getAvailableJobsDateRange(): Promise<{ earliest: Date | null; latest: Date | null; files: string[] }>` function that scans `mock-data/jobs/` directory
  - [x] 2.3 Filter out archived files and non-JSON files in the scan function
  - [x] 2.4 Extract dates from all valid job filenames using the date calculator utility
  - [x] 2.5 Sort files by date and return the earliest and latest dates along with file list
  - [x] 2.6 Implement `validateThreeMonthRequirement(latestDate: Date, earliestDate: Date): { isValid: boolean; requiredStart: Date; requiredEnd: Date; gaps: string[] }` function
  - [x] 2.7 Calculate required 3-month range based on the latest date
  - [x] 2.8 Identify any gaps in coverage by comparing available dates against required range
  - [x] 2.9 Handle edge cases (no files, invalid dates, empty directory)

- [x] 3.0 Implement Database Coverage Query Functions
  - [x] 3.1 Create `getDatabaseDateRange()` function in `validate-data-coverage.ts`
  - [x] 3.2 Query the `jobs` table using Drizzle ORM to get `MIN(start_date)` and `MAX(start_date)`
  - [x] 3.3 Return result as `{ earliest: Date | null; latest: Date | null; jobCount: number }`
  - [x] 3.4 Handle empty database scenario (return null values)
  - [x] 3.5 Create `checkJobExists(gitLabJobId: string): Promise<boolean>` function to prevent duplicate insertions
  - [x] 3.6 Add proper error handling with try-catch blocks
  - [x] 3.7 Use existing database connection from `@/db`

- [ ] 2.0 Create Data Coverage Validation Module
  - [x] 2.1 Create `seed/seed-helpers/validate-data-coverage.ts` file
  - [x] 2.2 Implement `getAvailableJobsDateRange(): Promise<{ earliest: Date | null; latest: Date | null; files: string[] }>` function that scans `mock-data/jobs/` directory
  - [x] 2.3 Filter out archived files and non-JSON files in the scan function
  - [x] 2.4 Extract dates from all valid job filenames using the date calculator utility
  - [x] 2.5 Sort files by date and return the earliest and latest dates along with file list
  - [x] 2.6 Implement `validateThreeMonthRequirement(latestDate: Date, earliestDate: Date): { isValid: boolean; requiredStart: Date; requiredEnd: Date; gaps: string[] }` function
  - [x] 2.7 Calculate required 3-month range based on the latest date
  - [x] 2.8 Identify any gaps in coverage by comparing available dates against required range
  - [x] 2.9 Handle edge cases (no files, invalid dates, empty directory)

- [x] 3.0 Implement Database Coverage Query Functions
  - [x] 3.1 Create `getDatabaseDateRange()` function in `validate-data-coverage.ts`
  - [x] 3.2 Query the `jobs` table using Drizzle ORM to get `MIN(start_date)` and `MAX(start_date)`
  - [x] 3.3 Return result as `{ earliest: Date | null; latest: Date | null; jobCount: number }`
  - [x] 3.4 Handle empty database scenario (return null values)
  - [x] 3.5 Create `checkJobExists(gitLabJobId: string): Promise<boolean>` function to prevent duplicate insertions
  - [x] 3.6 Add proper error handling with try-catch blocks
  - [x] 3.7 Use existing database connection from `@/db`

- [x] 4.0 Build Console Reporting System
  - [x] 4.1 Create `seed/seed-helpers/console-reporter.ts` file
  - [x] 4.2 Implement `reportDatabaseCoverage(earliest: Date | null, latest: Date | null, jobCount: number)` function with formatted output
  - [x] 4.3 Implement `reportRequiredCoverage(requiredStart: Date, requiredEnd: Date)` function
  - [x] 4.4 Implement `reportAvailableFiles(files: string[], earliest: Date | null, latest: Date | null)` function
  - [x] 4.5 Implement `reportValidationStatus(isValid: boolean, gaps: string[])` function with status icons (✓/⚠️/✗)
  - [x] 4.6 Implement `reportSeedingProgress(filesProcessed: number, totalFiles: number, currentFile: string)` function
  - [x] 4.7 Create `generateSummaryReport()` function that combines all reporting sections
  - [x] 4.8 Add visual separators and section headers for readability
  - [x] 4.9 Include color coding if terminal supports it (use console colors or check if chalk is available)

- [ ] 5.0 Enhance Seeding Logic for Smart Data Updates
  - [x] 5.1 Create `getJobsToSeed(availableFiles: string[], requiredStartDate: Date, requiredEndDate: Date): string[]` function
  - [x] 5.2 Filter available files to only include those within the required 3-month window
  - [x] 5.3 Create `seedMissingJobsOnly(jobFiles: string[]): Promise<{ seeded: number; skipped: number; errors: CustomError[] }>` function
  - [x] 5.4 For each job file, check if the job already exists in the database using `gitLabJobId`
  - [x] 5.5 Skip seeding if job already exists (increment skipped counter)
  - [x] 5.6 Seed only new jobs with their related data (institutions, procedures, waiting periods, max allowed days)
  - [x] 5.7 Reuse existing seed helper functions (`insertJobs`, `insertProcedures`, etc.) but with individual job processing
  - [x] 5.8 Maintain transaction safety for each job insertion to prevent partial data
  - [x] 5.9 Collect and return statistics (seeded count, skipped count, errors)

- [ ] 6.0 Create Main Command Entry Point
  - [ ] 6.1 Create `seed/ensure-fresh-data.ts` file as the main entry point
  - [ ] 6.2 Import all validation, reporting, and seeding functions
  - [ ] 6.3 Implement main async function `ensureFreshData()` that orchestrates the entire process
  - [ ] 6.4 Step 1: Display header banner ("📊 Checking Local Database Data Coverage...")
  - [ ] 6.5 Step 2: Query database for current coverage using `getDatabaseDateRange()`
  - [ ] 6.6 Step 3: Scan available JSON files using `getAvailableJobsDateRange()`
  - [ ] 6.7 Step 4: Validate 3-month requirement and identify gaps
  - [ ] 6.8 Step 5: Display comprehensive report using console reporter functions
  - [ ] 6.9 Step 6: If coverage is inadequate, determine which files need seeding
  - [ ] 6.10 Step 7: Execute smart seeding for missing jobs only
  - [ ] 6.11 Step 8: Display final summary with before/after comparison
  - [ ] 6.12 Exit with appropriate status code (0 for success, 1 for warnings)
  - [ ] 6.13 Add proper error handling throughout the process
  - [ ] 6.14 Ensure script can be run with `if (require.main === module)` pattern

- [ ] 7.0 Integrate with Existing Seed Process
  - [ ] 7.1 Update `seed/seed-db.ts` to add optional validation step
  - [ ] 7.2 Add new question prompt: "Validate 3-month coverage: N/y:"
  - [ ] 7.3 If user chooses validation, call validation functions before proceeding
  - [ ] 7.4 Display coverage report and warnings if data is insufficient
  - [ ] 7.5 Allow user to proceed or abort based on validation results
  - [ ] 7.6 Update `seedDBFromJobs()` in `seed/seed-db-from-jobs.ts` to add post-seed coverage report
  - [ ] 7.7 After successful seeding, display final database coverage statistics
  - [ ] 7.8 Export validation functions from `seed/seed-helpers/index.ts` for reuse

- [ ] 8.0 Add Command to package.json and Update Documentation
  - [ ] 8.1 Add new script to `package.json`: `"db:ensure-fresh-data": "node -r dotenv/config -r esbuild-register seed/ensure-fresh-data.ts dotenv_config_path=.env.development.local"`
  - [ ] 8.2 Update README.md with new "Database Operations" section
  - [ ] 8.3 Document the `pnpm db:ensure-fresh-data` command with description and use cases
  - [ ] 8.4 Add examples showing expected output (successful case and warning case)
  - [ ] 8.5 Document the 3-month requirement and how dates are calculated
  - [ ] 8.6 Add troubleshooting section for common issues (no files, missing data, etc.)
  - [ ] 8.7 Update existing database seeding documentation to mention coverage validation
  - [ ] 8.8 Add note about historical data preservation strategy

- [ ] 9.0 Write Comprehensive Tests
  - [ ] 9.1 Create `seed/seed-helpers/date-range-calculator.test.ts`
  - [ ] 9.2 Test `calculateThreeMonthsBack()` with various dates including edge cases (end of month, leap years)
  - [ ] 9.3 Test `extractDateFromJobFilename()` with valid and invalid filename formats
  - [ ] 9.4 Test date formatting and comparison functions
  - [ ] 9.5 Create `seed/seed-helpers/validate-data-coverage.test.ts`
  - [ ] 9.6 Mock file system operations using Vitest mocks for `getAvailableJobsDateRange()`
  - [ ] 9.7 Test validation with various scenarios: adequate coverage, missing recent data, gaps in coverage, no files
  - [ ] 9.8 Test database query functions with in-memory SQLite database (following existing test patterns in `test/setup.ts`)
  - [ ] 9.9 Create test fixtures with sample job data for different date ranges
  - [ ] 9.10 Test `checkJobExists()` function with existing and non-existing jobs
  - [ ] 9.11 Test smart seeding logic to ensure it skips existing jobs and only seeds new ones
  - [ ] 9.12 Test console reporter functions (mock console.log to verify output format)
  - [ ] 9.13 Run all tests with `pnpm test` and ensure 100% pass rate
  - [ ] 9.14 Verify test coverage is adequate for all new modules
