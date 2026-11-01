# At most one Job per day

The source project's `run` job sometimes runs more than once a day (manual reruns). We store at most one **Job** per day, the Ljubljana calendar day of the **Snapshot**'s `start`, and ignore later runs on a covered day, whatever their GitLab job ID. Prod already held exactly one Job per day when we decided this (2026-11-01), the gap check (#201) counts a covered day as not missing, and a single rule replaced three different "already stored" checks.

## Considered Options

- **Only the GitLab job ID is unique**: stores reruns as extra Jobs, so time-series reads get two points for one day, and it contradicts prod.
- **A unique `day` column in the database**: the database would guarantee the rule, but it needs a schema change and a backfill of prod with no migration history. The rule is enforced in code, inside the ingest transaction, instead. Two ingests of different same-day runs at the same moment could both pass; that hasn't happened, and the column is the upgrade path if it does.

## Consequences

If the first run of a day stores bad data and the source reruns it, we keep the bad Job. Fixing it is manual: delete the stored Job, which cascades to its Waiting Periods and Max Allowed Days, then backfill the rerun by its GitLab job ID.
