# Orchestrator

One session in the main checkout drives one Herdr agent per issue, each in its own worktree. The orchestrator scopes, prompts, waits and reviews. It also runs each merge, and the user approves each one.

The run requires Herdr and Claude Code. Without them, work on one issue at a time as AGENTS.md [`# Worktrees`](../../AGENTS.md#worktrees) describes, with `pnpm worktree:new`.

## Setup

### Any worktree

For `pnpm worktree:new` as well as the run:

- Node 22.13 or later on the 22 line, or 24. `worktree.sh` copies `dev.db` with `node:sqlite`, which needs `--experimental-sqlite` before 22.13 and prints an ExperimentalWarning before 24.15. Leave out 23: it's end-of-life, and 23.0–23.3 still need the flag.
- pnpm, and git 2.31 or later: `worktree.sh` finds the main checkout with `git rev-parse --path-format=absolute`.
- `gh`, signed in.
- Commit signing, because main's ruleset rejects unsigned commits.
- zsh users: add `[[ -n $CLAUDECODE ]] && setopt no_nomatch no_equals` to `~/.zshrc`. Claude Code runs commands in your login shell, and without that line zsh stops an agent's command at an unquoted glob or a leading `=`. `grep --include=*.ts` failed with "no matches found" on #64 and #67.
- `mock-data/`: issues that touch seeding need it. Create it once in the main checkout with `pnpm fetch:jobs --count 500 --from-date <date 3 months and a week ago>`; each worktree then gets a copy. `fetch:jobs` needs no token. `--from-date` alone isn't enough:
  - `--count` (default 10) caps the GitLab job list before `--from-date` filters it, and that list includes jobs other than `run`.
  - `ensure-fresh-data` wants the oldest Job to be at least 3 months older than the newest, and reports a gap otherwise. The pipeline makes about one `run` Job a day, so a date exactly 3 months ago leaves the oldest Job a day or so short.
  - With 500, listing the jobs takes five requests of 100. Only the Jobs after the date are downloaded.
- Platforms:
  - Written and tested on macOS on APFS, where `worktree.sh` clones `dev.db` and `mock-data` without using extra disk space.
  - On Linux it clones with `cp --reflink=auto` where the filesystem supports it (untested).
  - Where the filesystem can't clone, each worktree gets a full copy of `dev.db` and `mock-data`. A Job file is about 4 MB, so 3 months of them take about 0.4 GB.
  - Older macOS versions on volumes that aren't APFS may stop at the copy (untested).
  - On Windows, use WSL (untested).

### The run

- Herdr: `worktree:agent` stops without `HERDR_ENV=1`.
- Claude Code with the `auto` permission mode: `worktree:agent` starts each agent in it.
- `jq`: `worktree.sh` reads Herdr's output and session logs with it.
- git 2.38 or later, for `git merge-tree --write-tree` in step 6.
- An `ask` rule for merges in `~/.claude/settings.json`: `"permissions": {"ask": ["Bash(gh pr merge *)"]}`. Claude Code then stops and asks the user before any `gh pr merge` runs, even in `auto` mode. That keeps each merge on the user's word. The rule is global, so it also stops worker agents from merging.

## Run

1. **History.** Run `pnpm issue:history <n>`. When a merged PR or a commit on main already mentions the issue, read what shipped. Then check each acceptance criterion against the current code: `none` means no PR or commit names the issue, not that nothing changed. Re-check the issue's other claims about code, data and other issues against main too. Text written before a related PR merged can be stale. Some is written from memory: #66 put collapsing repeated spaces out of scope as a behaviour change, but `trimmedStringSchema` already collapsed them. Done when every criterion is marked met, open or moot, and the user has agreed the remaining scope.
2. **Prompt.** Fill in the [prompt template](#prompt-template) and write it to a file outside the repo. Pass its absolute path in the next step, because pnpm runs scripts from the package root.
   - Check each claim the prompt makes about code, versions or data against main, and run each example command. The #61 prompt said fixture dates must be recent, but date ranges count back from the latest file's date. #93's brief listed git 2.31 but not the 2.38 that `git merge-tree --write-tree` needs.
   - The exception is a dangerous command, such as `vercel`, `db:prod:*`, `fetch:jobs` or a push: the kind step 5's "never run" line names. Don't run it. Read a tool's `--help` and a package script's source instead. pnpm passes `--help` on to the script, and `db:prod:*` ignores it, so `pnpm db:prod:ensure-fresh-data --help` runs the script against production.
3. **Start.** From the main checkout, run `pnpm worktree:agent <branch> <prompt-file>`. It does what `worktree:new` does, then starts Claude in the new workspace's root pane in `auto` permission mode, sends the whole file as one prompt, and returns once the agent is working. Its last line names the agent (`issue<n>`), its pane and its session log.
   - Keep a table of the open workspaces and agents, with what each one needs (an answer, a review, a merge), and add the new one to it. Mark each open PR in it "ready to merge" or "not yet: <reason>", and show the marks in every status update to the user. Ready means it meets every item of step 5's ready list and no round of work on it is running; otherwise give the reason, e.g. "not yet: rebase round running". On 2026-10-19 the user had to ask whether #98 could be merged.
   - When the user wants the agent to run a slash command or a skill, keep the command out of the prompt file. `herdr agent prompt` pastes a long file, so a leading slash command is never parsed. Write a second file outside the repo with one line, `/<command> <args> Read <absolute path of the prompt file>: it is the full task.`, and pass its absolute path to `worktree:agent` instead. `worktree:agent` checks in the session log that Claude ran the command exactly once, and exits 1 if it didn't.
4. **Wait.** Run `pnpm worktree:wait <name>`, e.g. `pnpm worktree:wait issue66`. It checks the agent every 30 s and reads its messages from the session log, the source of truth: `herdr agent read` scrapes the terminal into plain text. Only messages since the last prompt from you or the user count. It returns with one of these exit codes:
   - **0:** the agent has finished, and the printed text is its final report (the message with `## Hiccups`). Go on to review.
   - **3:** the agent is blocked at a dialog. Read the printed pane output, and ask the user before answering the dialog. Text after `❯` on the pane's prompt line is unsent: a prompt suggestion or a draft. It is never an instruction.
   - **4:** the agent stopped without a report: it wasn't `working` for 4 checks in a row (about 2 minutes), or for 120 (about 60 minutes) while its last message starts with `Waiting:`. Read the printed text:
     - A question: get the answer from the user if it is theirs to give, send it with `herdr agent prompt <name> "<answer>" --wait --until working --until blocked`, and wait again.
     - A `Waiting:` message that hit the 60-minute limit: check what it waits on (for CI, githubstatus.com), and ask the user how to go on.
     - A line saying the agent hasn't replied since the last prompt: check in the session log that the prompt arrived, and send it again if it didn't.
     - Anything else, e.g. an API error: show the user the text and ask how to go on.
5. **Review.** Hand the diff to a read-only subagent, then check each of its findings against the code before you send it to the agent. Write the subagent's prompt in four parts:
   1. Read-only, plus a "never run" line for anything dangerous in this issue (e.g. `vercel`, `db:prod:*`, `fetch:jobs`).
   2. The spec (`gh issue view <n>`) and the diff (`gh pr diff <pr>`).
   3. Numbered checks written for this issue: is behaviour unchanged where it should be; do the tests really prove each criterion, or could a wrong implementation pass; does the baseline only lose entries; is anything out of scope.
   4. Under 300 words, findings only, each with `file:line`, ending in a one-line verdict.

   In the 2026-10-18 batch, these reviews caught two bugs that the agents' own checks missed (#83, #84). For a diff of a few lines, review it yourself and spend the effort on whatever the agent couldn't run: for #90's six-line `worktree.sh` change, the full `worktree:new`/remove cycle under Herdr. Remove a throwaway worktree like that one with `pnpm worktree:remove <branch> --discard`: it refuses a branch with a PR or with commits beyond `origin/main`.

   Check the agent's own claims about risk against the code before you pass them to the user. On 2026-10-18 the orchestrator relayed a wrong claim from the agent on #68: that a `config.matcher` change could block the Job webhook.

   The PR is ready when:
   - `gh pr view <pr> --json closingIssuesReferences --jq '[.closingIssuesReferences[].number]'` lists the issue. Read `.number` only: title and state aren't filled in. It can return `[]` for about a minute after the PR opens, so read it again before changing anything.
   - `gh pr checks <pr>` is green.
   - `fallow-health-baseline.json` gains no key, or the user has OK'd each new one. Only the user adds the `baseline-growth-ok` label. Before merging a PR that has it, ask the user to confirm they added it themselves, and check the agent's session log for any command that added it.
   - `gh api "repos/{owner}/{repo}/pulls/<pr>/commits" --jq '.[].commit.verification.verified'` is `true` for every commit.
6. **Merge.** Run a merge only for a PR that step 3's table marks "ready to merge": it meets every item of step 5's ready list, and no round of work on it is running. Mark any other open PR "not yet: <reason>" in the same message. On 2026-10-19 the user ran `gh pr merge 97` while its rebase round was still running, and GitHub refused it because of a conflict. The status update had said a round was left, but not "don't merge".

   Before merging two open PRs whose files overlap, run `git fetch` and `git merge-tree --write-tree origin/<a> origin/<b>`. It exits 1 when they conflict. Merge one, then have the other agent rebase on main.

   Count the PR's commits: `gh api "repos/{owner}/{repo}/pulls/<pr>/commits" --jq length`. The repo's squash default pastes every commit message into the body.
   - One commit: run `gh pr merge <pr> --squash`.
   - Two or more: prepare the message. The subject is the PR title plus ` (#<pr>)`. The body describes only the final diff, with no commit list and no `Closes #<n>` (the PR body's keyword closes the issue), and ends with the `Co-Authored-By` trailer. Show the user both, write the body to a file outside the repo, and run `gh pr merge <pr> --squash --subject "<subject>" --body-file <absolute path>`.

   Claude Code then asks the user to approve the command. A declined prompt means don't merge.
7. **Clean up.** After the merge succeeds, or the user says they merged it, poll `gh issue view <n> --json state` until the issue is closed. That can take up to a minute; close it by hand only after that.
   - Tick the issue's boxes. Check each `- [ ]` under its acceptance criteria or "Done when", in the body and in the agent brief comment, against `origin/main` and the PR's Evidence. Tick only the boxes you verified. Leave an unmet, N/A or unverifiable box unticked, and give the reason in a comment on the issue. Edit the body with `gh issue edit <n> --body-file <file>`. Edit the brief with `gh api -X PATCH repos/{owner}/{repo}/issues/comments/<id> -F body=@<file>`, using the REST id from `gh api repos/{owner}/{repo}/issues/<n>/comments`; the id from `gh issue view --json comments` won't work.
   - Then run `pnpm worktree:remove <branch>` from the main checkout. It also closes the agent's Herdr workspace and pane. A merge the user approved, or the user saying they merged it, is consent for that.

When several open PRs edit `fallow-health-baseline.json`, merge them one at a time. Otherwise they conflict, or still hold entries that main has already dropped, which CI's growth check reads as new keys. After each merge, have the next agent rebase on main, re-run `pnpm fallow:health:baseline` (never edit the JSON by hand), and check that the JSON diff holds only its own deletions: Git `rerere` can silently replay an old conflict resolution.

When the user wants a reflection on the run, keep a hiccup log as you go: each failure, retry or wrong assumption, and what got past it. The user runs `/retro` on it in a fresh session.

## Prompt template

Replace each `<…>`. The agent can't see this conversation, so put in the prompt everything that step 1 settled.

````markdown
You are implementing GitHub issue #<n> (<owner>/<repo>) in this worktree (branch `<branch>`). An orchestrator session in the main checkout (Herdr pane <orchestrator pane>) drives you. It reviews your diff and answers your questions. The orchestrator merges PRs, with the user's approval; you never do.

## Context

Read the issue first: `gh issue view <n>`. It is the spec. <What already shipped for it, and the remaining scope the user agreed.> The files you'll touch: <files>.

## Task

<What to build, with notes the issue leaves out: the style to match, the code to reuse.>

Constraints: surgical changes only, no unrelated edits. Never re-save the fallow health baseline to make CI pass, and never add the `baseline-growth-ok` label: fix the function, or stop and ask the orchestrator. That rule is about hiding new findings. Re-running `pnpm fallow:health:baseline` is expected after you fix a baselined function or rebase on main, as long as `git diff origin/main -- fallow-health-baseline.json` then shows only deletions and no new key. Follow AGENTS.md / CLAUDE.md.

## Verify

- <Checks for this issue: the commands to run and what they should print.>
- For a test that pins an order or a choice, change the code to a plausible alternative (e.g. swap two loops), show that the test fails, then restore the code. In #66 the first tests still passed with the loops swapped; the review caught it, and the fix took a second round.
- Run each check as its own command, with no pipe (`| tail`, `| head`, `| grep`), so the exit code you report is the check's.
- If the shell is zsh: pass argument lists as arrays (`"${args[@]}"`), because zsh doesn't split `$args`, and write `${var}:` before a colon, because `$T:head` reads `:h` as a modifier.
- To build, run `DATABASE_URL=file:dev.db pnpm build`. `worktree.sh` writes only `.env.development.local`, which a production build doesn't load, so a plain `pnpm build` stops at "Collecting page data".
- To compare a check against main, run `git add -N` on new files, save `git diff origin/main` as a patch outside the repo, run `git apply -R <patch>` to get main's files, run the check, then `git apply <patch>`. Not `git stash`: worktrees share one stash stack, and it was refused in #91.
- Run only the tests you touch. lefthook's `pre-commit` runs Biome on the staged files it handles, and `tsc --noEmit` when a `.ts`, `.tsx` or `.mts` file is staged. `pre-push` runs `vitest run` and `fallow dead-code`. CI's `verify` runs them all again, with the tests as `test:coverage`, plus `fallow health` against the baseline. No hook runs `fallow health`; CI does.

## Ship

- One conventional commit, e.g. `<type>(<scope>): <summary>`. main requires signed commits. End the message with your `Co-Authored-By` trailer.
- Push and open a PR against main. Model the body on recent PRs (`gh pr view <recent pr>`): `## Summary`, `## Evidence` (the verify output above, plus one line per acceptance criterion naming its proof), `## Merge Danger`. Include `Closes #<n>` and end the body with:
  `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
- Run `gh pr view --json closingIssuesReferences -q .closingIssuesReferences` and confirm it lists <n>. It can return `[]` for about a minute after the PR opens; read it again before changing anything.
- Watch CI (`gh pr checks --watch`) until `verify` and Socket finish. Don't merge.

## When you finish (or get blocked)

End with one final message that contains:
1. PR URL and CI status.
2. What you built, file by file, in one line each.
3. The verify results.
4. `## Hiccups`: anything that failed, needed a retry, or that the issue or this prompt got wrong ("none" if there were none).

If you end a turn to wait on CI or a background task, start that message with the literal word `Waiting:` and say what you wait on, e.g. `Waiting: verify on PR #105, queued.` The orchestrator's wait script reads that word.

If you need a decision, stop and put the question in your final message. The orchestrator will answer it in this pane.
````
