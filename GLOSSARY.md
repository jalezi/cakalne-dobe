# Ubiquitous Language

## Core Entities

| Term                 | Definition                                                                                                                  | Aliases to avoid                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Institution**      | A medical facility in Slovenia where procedures are performed                                                               | Facility, provider, center             |
| **Procedure**        | A categorized medical service identified by a unique code and name                                                          | Treatment, service, operation          |
| **Waiting Period**   | The number of days a patient must wait at a specific institution to receive a specific procedure, classified by urgency     | Waiting time, wait time, delay         |
| **Max Allowed Days** | The regulatory ceiling on how many days a patient may wait for a procedure, per urgency level                               | Maximum wait, legal limit, threshold   |
| **Job**              | A data-collection event tied to a GitLab CI/CD pipeline run, capturing a snapshot of all waiting periods at a point in time | Run, pipeline, crawl, import, snapshot |

## Urgency Levels

| Term         | Definition                                                  | Aliases to avoid               |
| ------------ | ----------------------------------------------------------- | ------------------------------ |
| **regular**  | Standard urgency — the default pathway for non-urgent cases | Normal, ordinary, standard     |
| **fast**     | Expedited urgency — for cases requiring sooner attention    | Urgent, priority, medium       |
| **veryFast** | Critical urgency — the fastest available pathway            | Emergency, critical, immediate |

## Lifecycle & Operations

| Term                        | Definition                                                                                                                                                                                 | Aliases to avoid                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| **Snapshot**                | The complete set of waiting periods recorded during a single **Job**                                                                                                                       | Dataset, batch, import           |
| **Seeding**                 | The process of loading historical **Job** artifacts into the database                                                                                                                      | Migration, import, backfill      |
| **Coverage**                | The continuous date range represented by **Jobs** stored in the database                                                                                                                   | Date range, span, history        |
| **Snapshot Insert Payload** | The in-memory, DB-ready shape derived from a **Snapshot** — procedures, institutions, max allowed days, and waiting periods keyed for bulk insertion, before any database IDs are assigned | NotCompleteDataByTable, raw data |

## Relationships

- A **Job** contains one or more **Waiting Periods**, each scoped to one **Institution** and one **Procedure**.
- A **Procedure** has exactly one **Max Allowed Days** record per **Job** (one per urgency level).
- A **Waiting Period** belongs to exactly one **Job**, one **Institution**, and one **Procedure**.
- A **Job** is the primary key anchor: deleting a **Job** cascades to its **Waiting Periods** and **Max Allowed Days**.

## Example dialogue

> **Dev:** "When a **Job** runs, what exactly gets stored?"

> **Domain expert:** "Each **Job** records the **Waiting Period** — in days — for every combination of **Institution** and **Procedure** active on that date, broken down by urgency: **regular**, **fast**, and **veryFast**."

> **Dev:** "And the **Max Allowed Days** — is that per **Institution** too?"

> **Domain expert:** "No. **Max Allowed Days** is a regulatory limit on the **Procedure** itself, not per **Institution**. It's the same ceiling regardless of which hospital you go to."

> **Dev:** "So if I want to flag an **Institution** that is over the limit, I compare its **Waiting Period** against the **Procedure**'s **Max Allowed Days** for the same urgency level?"

> **Domain expert:** "Exactly. And you always anchor that comparison to a specific **Job** — the limit can change between **Jobs** if regulations are updated."

## Flagged ambiguities

- **"facility" vs "institution"** — The raw JSON job artifacts and some seed helpers use `facility` to name the same concept the database calls `institution`. Prefer **institution** everywhere in domain discussions and new code. `facility` should be treated as an implementation detail of the raw data format only.
- **"waiting time" vs "waiting period"** — The seed helper `insertWaitingTimes` and several comments use "waiting time" while the schema, types, and Zod schemas consistently use `waitingPeriods`. Prefer **waiting period** as the canonical term; "waiting time" is a synonym to avoid.
- **"job"** — Overloaded: it refers to the GitLab CI/CD pipeline run (external concept) and the database record representing the resulting data collection event (internal concept). In domain conversations, **Job** always means the internal database record capturing a snapshot of waiting periods at a specific point in time. The external pipeline is simply its source.
