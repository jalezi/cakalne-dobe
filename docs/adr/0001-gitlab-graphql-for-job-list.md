# Use GitLab's GraphQL API to list the source project's jobs

To find new data, the app lists the successful CI jobs of the public GitLab project `wayback-automachine/cakalne-dobe`, a project we don't own, and keeps the newest `run` job. We call GitLab's GraphQL API (`https://gitlab.com/api/graphql`, `project(fullPath) { jobs(statuses: [SUCCESS]) }`) because it returns that list, paged and filtered by status, in one request without a token. GitLab's REST endpoint for the same list, `GET /projects/:id/jobs`, answers `401 Unauthorized` without one (checked 2026-10-31).

## Considered Options

- **REST `GET /projects/:id/jobs?scope=success`**: needs a GitLab access token, which means a secret to create, store in Vercel and rotate, only to read public data.
- **REST `GET /projects/:id/pipelines?status=success`, then `GET /pipelines/:id/jobs`**: works without a token, but takes one request per pipeline instead of one per page.

## Consequences

The GraphQL API is called with a plain `fetch` POST of `{ query, variables }`. No GraphQL client library or `graphql` package is needed. The job data itself is not fetched through this API: each job's `out.json` artifact comes from GitLab Pages.
