# PRD: Always Show Most Recent Data on Homepage Chart

## 1. Introduction/Overview

Currently, the homepage chart (default tab: "AvgWTChart") may display "Ni podatkov" (No data) if the local or production database does not have up-to-date data for the default query. This feature ensures that the chart always displays some data—specifically, the most recent available data from the last 30 days (or similar), regardless of environment. If fallback data is shown, the user is informed with a clear label, using shadcn/ui components for UI consistency.

## 2. Goals

- Ensure the homepage chart always displays data, even if the default query is empty.
- Automatically fall back to the most recent available data for the selected procedure within the last 30 days (or similar window).
- Clearly indicate to the user when fallback data is being shown.
- Apply this logic in both local development and production environments.

## 3. User Stories

- As a user, I want to always see some data on the homepage chart, so I am not presented with an empty or confusing interface.
- As a developer, I want the homepage to show fallback data in local development, so I can test the UI even with an incomplete database.
- As a user, I want to know when the data shown is fallback data, so I understand its context.

## 4. Functional Requirements

1. The system must attempt to display data for the default chart query (e.g., for the most recent period/procedure).
2. If no data is found, the system must query for the most recent available data for the selected procedure within the last 30 days (or a similar recent window).
3. If fallback data is shown, the system must display a clear label (e.g., "Showing last available data") using shadcn/ui components.
4. If there is no data at all in the database, the system must display a clear message (e.g., "No data available").
5. This logic must apply in both local development and production environments.
6. The fallback logic should be implemented in a way that is easy to maintain and extend.

## 5. Non-Goals (Out of Scope)

- Implementing custom data seeding or mock data generation.
- Providing different fallback logic for dev vs. prod environments.
- Changing the design or layout of the chart beyond the fallback indicator.

## 6. Design Considerations

- Use shadcn/ui components for any new UI elements (e.g., Alert, Badge, or similar for the fallback label).
- The fallback indicator should be visually distinct but not disruptive.
- Match the existing style and spacing of the homepage.

## 7. Technical Considerations

- The fallback query should be efficient and not impact page load time.
- The logic should be encapsulated for easy testing and future modification.
- Ensure compatibility with both local SQLite and production databases.

## 8. Success Metrics

- The homepage chart never displays an empty state unless there is truly no data in the database.
- Users and developers can always see some data on the homepage chart.
- The fallback indicator is visible when appropriate.

## 9. Open Questions

- What is the exact time window for fallback data (30 days, 60 days, etc.)? (Default: 30 days)
- Should the fallback always use the most recent data, or should it try to match the selected procedure as closely as possible?
- Should the fallback indicator include a timestamp or date range for clarity?

---

This PRD is ready for review and implementation. Please clarify any open questions as needed.
