<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

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
The machine needs what [Any worktree](./docs/agents/orchestrator.md#any-worktree) in `docs/agents/orchestrator.md` lists.

Before changing any file for an issue, run `git rev-parse --path-format=absolute --git-dir --git-common-dir`. Two different paths mean you are already in a worktree: carry on. The same path means you are in the main checkout. First run `pnpm issue:history <n>` and check each acceptance criterion against the current code, since work that never named the issue doesn't show up in it. When it finds a merged PR or a commit, read what shipped. Agree the remaining scope with the user. Then create the worktree. In **Herdr** (`HERDR_ENV=1`), follow `docs/agents/orchestrator.md`: the prompt template, `pnpm worktree:agent <branch> <prompt-file>` (which also starts the agent), and the run through to cleanup. A skill the user types in the main checkout under Herdr, such as `/implement <n>`, still goes to a spawned agent: pass the command on as the run's **Start** step describes. The agent implements the issue, and this session doesn't. Elsewhere, run `pnpm worktree:new <branch>` (e.g. `fix/29-import-db-reason`) and continue from what it prints:

- **Claude Code**: switch into the printed path with `EnterWorktree`. In that session, Claude Code refuses any `gh` command with a quoted argument: take the PR title from the commit subject with `gh pr create --fill-first --body-file <file>`, and use `--json` with an unquoted `-q`.
- **Anywhere else**: work in the printed path.

In a worktree, the database is its own `dev.db`, opened directly through `DATABASE_URL=file:dev.db`; `turso dev` runs only in the main checkout.

Once the user confirms the PR is merged, `pnpm worktree:remove <branch>`, run from the main checkout, deletes the worktree and its branch.

