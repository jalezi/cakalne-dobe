<!-- BEGIN:nextjs-agent-rules -->
 
# Next.js: ALWAYS read docs before coding
 
Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.
 
<!-- END:nextjs-agent-rules -->

# General Coding Behavior

Apply these rules for all coding tasks:

- Think before coding: state assumptions explicitly, surface tradeoffs, and ask when something material is unclear.
- Simplicity first: write the minimum code that solves the request and avoid speculative abstractions.
- Surgical changes: touch only the code required for the task and do not clean up unrelated areas.
- Goal-driven execution: define a concrete verification step and use it to confirm the change works.

[`CLAUDE.md`](./CLAUDE.md) is the fuller rationale and reference for these rules; this file contains the operative version that agents should follow.

# Worktrees

Work on each issue in its own worktree, so several issues can be in progress at once.

Before changing any file for an issue, run `git rev-parse --path-format=absolute --git-dir --git-common-dir`. Two different paths mean you are already in a worktree: carry on. The same path means you are in the main checkout. First run `pnpm issue:history <n>`: when a merged PR or a commit on main already mentions the issue, read what shipped and agree the remaining scope with the user. Then create the worktree. In **Herdr** (`HERDR_ENV=1`), follow `docs/agents/orchestrator.md`: the prompt template, `pnpm worktree:agent <branch> <prompt-file>` (which also starts the agent), and the run through to cleanup. Elsewhere, run `pnpm worktree:new <branch>` (e.g. `fix/29-import-db-reason`) and continue from what it prints:

- **Claude Code**: switch into the printed path with `EnterWorktree`.
- **Anywhere else**: work in the printed path.

In a worktree, the database is its own `dev.db`, opened directly through `DATABASE_URL=file:dev.db`; `turso dev` runs only in the main checkout.

Once the user confirms the PR is merged, `pnpm worktree:remove <branch>`, run from the main checkout, deletes the worktree and its branch.

