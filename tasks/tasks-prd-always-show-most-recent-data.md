## Relevant Files

- `src/components/charts/avg-wt.tsx` - Main chart component for average waiting time; will need logic for fallback data and UI indicator.
- `src/app/page.tsx` - Home page; controls which chart is shown and passes props.
- `src/actions/get-procedure-avg-wt-per-job-chart.ts` - Server action for fetching chart data; now supports fallback query.
- `src/components/ui/alert.tsx` (or similar) - shadcn/ui component for displaying fallback indicator.
- `test/db.server-action-chart.test.ts` - Tests for server action and fallback logic.
- `test/components/charts/avg-wt.test.tsx` - Unit tests for the chart component and fallback UI.

### Notes

- Unit tests should be placed alongside or near the code files they are testing.
- Use `pnpm test` to run all tests.

## Tasks

- [x] 1.0 Update Data Fetching Logic for Chart
  - [x] 1.1 Refactor the data fetching logic in the chart server action to attempt the default query, and if no data is found, query for the most recent available data for the selected procedure within the last 30 days.
  - [x] 1.2 Ensure the fallback query is efficient and works in both local and production environments.
  - [x] 1.3 Add/adjust types and interfaces as needed to support fallback logic.
  - [x] 1.4 Add/adjust tests for the server action to cover fallback scenarios.
- [x] 2.0 Implement Fallback UI Indicator Using shadcn/ui
- [x] 3.0 Update Home Page to Support Fallback Logic
- [x] 4.0 Add and Update Unit Tests for Fallback Logic
