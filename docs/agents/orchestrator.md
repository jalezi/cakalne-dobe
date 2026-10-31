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
- zsh users: add `[[ -n $CLAUDECODE ]] && { setopt no_nomatch no_equals sh_word_split; unalias -a; }` to `~/.zshrc`. Claude Code runs commands in your login shell, and without that line zsh stops an agent's command at an unquoted glob or a leading `=`. `grep --include=*.ts` failed with "no matches found" on #64 and #67. `sh_word_split` makes zsh split an unquoted `$x` the way bash does: in the #113–#115 batch on 2026-10-19, the orchestrator's `set -- $x` handed `git check-ref-format` one word, and it refused all three branches. `unalias -a` drops your aliases, because zsh expands an alias in place of a command's first word: on 2026-10-30, `alias c="clear"` broke an agent's helper function `c() { … }` with a parse error.
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
- For a [stacked run](#stacked-run), add `"Bash(gh stack merge *)"` to the same `ask` list. The `gh pr merge` rule doesn't match `gh stack merge`.
- Two `autoMode` entries in `~/.claude/settings.json`, for the force-push after a rebase (step 6, and the baseline paragraph after step 7): an `autoMode.allow` rule for `--force-with-lease` pushes of rebased feature branches, never `main`, and an `autoMode.environment` that trusts this repo and its worktrees folder. The user adds both by hand. Auto mode reads `autoMode` only from user settings, managed settings or `--settings`, not from the repo's `.claude/` files, and it refuses Claude's own edit as `[Self-Modification]`. Run `claude auto-mode config` to check the effective config. Without the rule, auto mode blocks the push as `[Git Destructive]`, as it did for #139's rebase on 2026-10-30, and the user runs each rebase's push from the orchestrator pane.

## Run

1. **History.** Read the issue with its comments: `gh issue view <n> --comments`. When triage left an Agent Brief comment, its acceptance criteria and out-of-scope list count along with the body's. On 2026-10-31 the orchestrator read only #135's body, and #135 was closed by #160 without two criteria that only its brief listed. Run `pnpm issue:history <n>`. When a merged PR or a commit on main already mentions the issue, read what shipped. Then check each acceptance criterion against the current code: `none` means no PR or commit names the issue, not that nothing changed. Re-check the issue's other claims about code, data and other issues against main too. Text written before a related PR merged can be stale. Some is written from memory: #66 put collapsing repeated spaces out of scope as a behaviour change, but `trimmedStringSchema` already collapsed them. Done when every criterion is marked met, open or moot, and the user has agreed the remaining scope.
2. **Prompt.** Fill in the [prompt template](#prompt-template) and write it to a file outside the repo. Pass its absolute path in the next step, because pnpm runs scripts from the package root.
   - Check each claim the prompt makes about code, versions or data against main, and run each example command. The #61 prompt said fixture dates must be recent, but date ranges count back from the latest file's date. #93's brief listed git 2.31 but not the 2.38 that `git merge-tree --write-tree` needs.
   - The exception is a dangerous command, such as `vercel`, `db:prod:*`, `fetch:jobs` or a push: the kind step 5's "never run" line names. Don't run it. Read a tool's `--help` and a package script's source instead. pnpm passes `--help` on to the script, and `db:prod:*` ignores it, so `pnpm db:prod:ensure-fresh-data --help` runs the script against production.
3. **Start.** From the main checkout, run `pnpm worktree:agent <branch> <prompt-file>`. It does what `worktree:new` does, then starts Claude in the new workspace's root pane in `auto` permission mode, sends the whole file as one prompt, and returns once the agent is working. Its last line names the agent (`issue<n>`), its pane and its session log.
   - Keep a table of the open workspaces and agents, with what each one needs (an answer, a review, a merge), and add the new one to it. Mark each open PR in it "ready to merge" or "not yet: <reason>", and show the marks in every status update to the user. Ready means it meets every item of step 5's ready list and no round of work on it is running; otherwise give the reason, e.g. "not yet: rebase round running". On 2026-10-19 the user had to ask whether #98 could be merged.
   - When the user wants the agent to run a slash command or a skill, keep the command out of the prompt file. `herdr agent prompt` pastes a long file, so a leading slash command is never parsed. Write a second file outside the repo with one line, `/<command> <args> Read <absolute path of the prompt file>: it is the full task.`, and pass its absolute path to `worktree:agent` instead. `worktree:agent` checks in the session log that Claude ran the command exactly once, and exits 1 if it didn't.
   - The template's [Verify](#prompt-template) bullets on pipes and zsh apply to your own commands too: the orchestrator hit both traps in the #113–#115 batch on 2026-10-19.
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
   2. The spec (`gh issue view <n> --comments`) and the diff (`gh pr diff <pr>`).
   3. Numbered checks written for this issue: is behaviour unchanged where it should be; do the tests really prove each criterion, or could a wrong implementation pass; does the baseline only lose entries; is anything out of scope.
   4. Under 300 words, findings only, each with `file:line`, ending in a one-line verdict.

   In the 2026-10-18 batch, these reviews caught two bugs that the agents' own checks missed (#83, #84). For a diff of a few lines, review it yourself and spend the effort on whatever the agent couldn't run: for #90's six-line `worktree.sh` change, the full `worktree:new`/remove cycle under Herdr. Remove a throwaway worktree like that one with `pnpm worktree:remove <branch> --discard`: it refuses a branch with a PR or with commits beyond `origin/main`.

   Check the agent's own claims about risk against the code before you pass them to the user. On 2026-10-18 the orchestrator relayed a wrong claim from the agent on #68: that a `config.matcher` change could block the Job webhook.

   The PR is ready when:
   - `gh pr view <pr> --json closingIssuesReferences --jq '[.closingIssuesReferences[].number]'` lists the issue. Read `.number` only: title and state aren't filled in. It can return `[]` for about a minute after the PR opens, so read it again before changing anything. For a `Refs` PR, the list doesn't include the issue, and the PR body has `Refs #<n>` instead.
   - `gh pr checks <pr>` is green.
   - `fallow-health-baseline.json` gains no key, or the user has OK'd each new one. Only the user adds the `baseline-growth-ok` label. Before merging a PR that has it, ask the user to confirm they added it themselves, and check the agent's session log for any command that added it.
   - `gh api "repos/{owner}/{repo}/pulls/<pr>/commits" --jq '.[].commit.verification.verified'` is `true` for every commit.
   - A PR that changes the version of a package with `skills: true` under `permissions:` in `pnpm-workspace.yaml` (today: fallow) has `npm diff --diff=<pkg>@<old> --diff=<pkg>@<new> skills` in its Evidence, and the user has seen what changed. The approval covers every version, so the new skills reach agents in `auto` mode on the next install, and the PR diff shows only version numbers.
6. **Merge.** Run a merge only for a PR that step 3's table marks "ready to merge": it meets every item of step 5's ready list, and no round of work on it is running. Mark any other open PR "not yet: <reason>" in the same message. On 2026-10-19 the user ran `gh pr merge 97` while its rebase round was still running, and GitHub refused it because of a conflict. The status update had said a round was left, but not "don't merge".

   Before merging two open PRs whose files overlap, run `git fetch` and `git merge-tree --write-tree origin/<a> origin/<b>`. It exits 1 when they conflict. Merge one, then have the other agent rebase on main and push with `git push --force-with-lease origin <branch>`. If auto mode blocks the push, the agent stops and reports; it doesn't work around the block.

   Count the PR's commits: `gh api "repos/{owner}/{repo}/pulls/<pr>/commits" --jq length`. The repo's squash default pastes every commit message into the body.
   - One commit: run `gh pr merge <pr> --squash`.
   - Two or more: prepare the message. The subject is the PR title plus ` (#<pr>)`. The body describes only the final diff, with no commit list and no `Closes #<n>` (the PR body's keyword closes the issue), and ends with the `Co-Authored-By` trailer. Show the user both, write the body to a file outside the repo, and run `gh pr merge <pr> --squash --subject "<subject>" --body-file <absolute path>`.

   Claude Code then asks the user to approve the command. A declined prompt means don't merge.
7. **Clean up.** After the merge succeeds, or the user says they merged it, poll `gh issue view <n> --json state` until the issue is closed. That can take up to a minute; close it by hand only after that.
   - Tick the issue's boxes. Check each `- [ ]` under its acceptance criteria or "Done when", in the body and in the agent brief comment, against `origin/main` and the PR's Evidence. Tick only the boxes you verified. Leave an unmet, N/A or unverifiable box unticked, and give the reason in a comment on the issue. Edit the body with `gh issue edit <n> --body-file <file>`. Edit the brief with `gh api -X PATCH repos/{owner}/{repo}/issues/comments/<id> -F body=@<file>`, using the REST id from `gh api repos/{owner}/{repo}/issues/<n>/comments`; the id from `gh issue view --json comments` won't work.
   - For a `Refs` merge, skip the close poll: the issue stays open by design. Tick only the boxes this PR alone meets; a box about the whole issue waits for the closing PR. #118 (`Refs #114`, 2026-10-20) met some boxes that covered the whole suite, but they weren't part 1's to tick.
   - Then run `pnpm worktree:remove <branch>` from the main checkout. It also closes the agent's Herdr workspace and pane. A merge the user approved, or the user saying they merged it, is consent for that.

When several open PRs edit `fallow-health-baseline.json`, merge them one at a time. Otherwise they conflict, or still hold entries that main has already dropped, which CI's growth check reads as new keys. After each merge, have the next agent rebase on main, re-run `pnpm fallow:health:baseline` (never edit the JSON by hand), and check that the JSON diff holds only its own deletions: Git `rerere` can silently replay an old conflict resolution. Then it pushes with `git push --force-with-lease origin <branch>`. If auto mode blocks the push, the agent stops and reports; it doesn't work around the block.

When the user wants a reflection on the run, keep a hiccup log as you go: each failure, retry or wrong assumption, and what got past it. The user runs `/retro` on it in a fresh session.

## Stacked run

A stack is a chain of PRs made with `gh stack` (v0.1.1), each PR based on the one below it. These steps replace the [run](#run)'s where they differ; the rest stays the same. Tried once, on 2026-10-31: five `docs(orchestrator)` layers, #153 → #149 → #122 → #123 → #167 (PRs #169–#173, GitHub "Stack #174").

1. **When.** A chain of issues that build on each other in one file or area. Give the stack one worktree and one agent: git won't check out one branch in two worktrees, and `gh stack rebase` rebases every layer. One big issue split into layers is untested. So is `fallow-health-baseline.json` across layers: no layer in the trial touched it.
2. **Setup.** Add the `gh stack merge` ask rule from [The run](#the-run). It also stops `gh stack merge --help`, so a prompt that asks for flag checks should expect that dialog (2026-10-31). In Run step 3, pass the bottom layer's branch: `pnpm worktree:agent <bottom branch> <prompt-file>`.
3. **Prompt.** Write one prompt for the stack, with a table of the layers (issue and branch each). In the [template](#prompt-template)'s Ship, replace the commit, push and PR bullets with these; the rest stays:
   - `gh stack init <bottom branch>` adopts the worktree's branch as layer 1. For each next layer, run `gh stack add <branch>`, edit, then `git commit`. Leave out `-A` and `-u`, which open an editor without `-m`, and `-m`, which names the branch from the message when no branch is given.
   - Exactly one signed commit per layer. `gh stack merge` has no `--subject` or `--body`, so the squash uses the commit message, `Co-Authored-By` trailer included. Keep `Closes #<n>` out of it. In the commit message and the PR bodies, put no closing word (close, closed, fix, resolve…) right before any issue number. On 2026-10-31 such a phrase in #173's body linked #135 as well as #167.
   - `gh stack submit --auto --open` pushes every layer and opens ready PRs. Without `--auto` an editor opens; without `--open` the PRs are drafts. Each PR's base is the layer below. Titles are the commit subjects, and bodies are the commit body plus a "Stack created with GitHub Stacks CLI" footer, so then run `gh pr edit <pr> --title <subject> --body-file <file>`. Each body has `Closes #<n>` for its own issue only. `closingIssuesReferences` lists it even when the base isn't `main`.
   - For a review fix, check out the layer that owns it, run `git commit --amend`, then `gh stack rebase --no-trunk` to cascade it up, and `gh stack push`. That push is a force-with-lease. Auto mode didn't block it on 2026-10-31, and the rebased commits stayed signed. If auto mode blocks it, the agent stops and reports.
4. **Review.** Review each layer's own diff, `git diff <layer below>..<layer>`, as Run step 5 says. Before a merge, check Run step 5's ready list for every layer it includes.
5. **Merge.** From the main checkout, run `gh stack merge <top PR to include> --squash --yes`. It merges every layer up to that PR in one go, or none, and the ask rule makes the user approve it. A bare number is read as a stack number first, then as a PR. Each layer lands as its own squash commit: its commit message plus ` (#<pr>)`, with no commit list. On 2026-10-31, `gh stack merge 170` landed #169 and #170 only.
   - After a partial merge, GitHub rebases the layers above onto `main` itself (committer "GitHub", signatures valid) and retargets the lowest open one to `main`. Wait for `verify` to re-run on them, then check their ready list again.
   - The agent's local branches are now behind. Catching them up with `gh stack sync` is untested, and so is the web UI's **Rebase stack**.
6. **Clean up.** Each layer's PR closes its own issue. Poll and tick boxes per issue, as Run step 7 says. Then run `pnpm worktree:remove <bottom branch>`. It checks only the named branch, so it worked on 2026-10-31 with the top layer checked out, and the gh-stack metadata goes with the worktree. The other local layer branches stay. The layers GitHub rebased after a partial merge differ in SHA from their merged PR heads, so `worktree:remove` would refuse them. For each remaining branch, check that its patch matches its PR's head, then delete it. `git show <branch>` shows only the top commit, which is the whole layer while each layer is one commit:

   ```sh
   git fetch origin pull/<pr>/head
   git show <branch> | git patch-id --stable
   git show FETCH_HEAD | git patch-id --stable
   git branch -D <branch>
   ```

   Run the last line only when the two patch ids (the first field) match. The pipes feed `patch-id`; check its output, not the exit code. GitHub deletes the remote branches.

## Prompt template

Replace each `<…>`. The agent can't see this conversation, so put in the prompt everything that step 1 settled.

```markdown
You are implementing GitHub issue #<n> (<owner>/<repo>) in this worktree (branch `<branch>`). An orchestrator session in the main checkout (Herdr pane <orchestrator pane>) drives you. It reviews your diff and answers your questions. The orchestrator merges PRs, with the user's approval; you never do.

## Context

Read the issue first, with its comments: `gh issue view <n> --comments`. The body is the spec, together with the acceptance criteria and out-of-scope list of the Agent Brief comment, when there is one. <What already shipped for it, and the remaining scope the user agreed.> The files you'll touch: <files>.

## Task

<What to build, with notes the issue leaves out: the style to match, the code to reuse.>

Constraints: surgical changes only, no unrelated edits. Never re-save the fallow health baseline to make CI pass, and never add the `baseline-growth-ok` label: fix the function, or stop and ask the orchestrator. That rule is about hiding new findings. Re-running `pnpm fallow:health:baseline` is expected after you fix a baselined function or rebase on main, as long as `git diff origin/main -- fallow-health-baseline.json` then shows only deletions and no new key. Follow AGENTS.md / CLAUDE.md.

## Verify

- <Checks for this issue: the commands to run and what they should print.>
- For a test that pins an order or a choice, change the code to a plausible alternative (e.g. swap two loops), show that the test fails, then restore the code. In #66 the first tests still passed with the loops swapped; the review caught it, and the fix took a second round.
- Run each check as its own command, with no pipe (`| tail`, `| head`, `| grep`), so the exit code you report is the check's.
- If the shell is zsh: pass argument lists as arrays (`"${args[@]}"`), because an array keeps each argument whole, even one with spaces (zsh splits an unquoted `$args` only with `sh_word_split`), and write `${var}:` before a colon, because `$T:head` reads `:h` as a modifier.
- To build, run `DATABASE_URL=file:dev.db pnpm build`. `worktree.sh` writes only `.env.development.local`, which a production build doesn't load, so a plain `pnpm build` stops at "Collecting page data".
- Two DB scripts wait for input. Run `pnpm drizzle:local:push < /dev/null`: with input left open, it prints "No changes detected" and never exits. Run `pnpm db:local:seed <<< N`: it first asks "Delete tables: N/y", and `N` keeps the tables. Both cost a retry in #131.
- To compare a check against main, run `git add -N` on new files, save `git diff origin/main` as a patch outside the repo, run `git apply -R <patch>` to get main's files, run the check, then `git apply <patch>`. Not `git stash`: worktrees share one stash stack, and it was refused in #91.
- Run only the tests you touch. lefthook's `pre-commit` runs Biome on the staged files it handles, and `tsc --noEmit` when a `.ts`, `.tsx` or `.mts` file is staged. `pre-push` runs `vitest run` and `fallow dead-code`. CI's `verify` runs them all again, with the tests as `test:coverage`, plus `fallow health` against the baseline. No hook runs `fallow health`; CI does.

## Ship

- One conventional commit, e.g. `<type>(<scope>): <summary>`. main requires signed commits. End the message with your `Co-Authored-By` trailer.
- Push and open a PR against main. Model the body on recent PRs (`gh pr view <recent pr>`): `## Summary`, `## Evidence` (the verify output above, plus one line per acceptance criterion naming its proof), `## Merge Danger`. Include `Closes #<n>` and end the body with:
  `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
- Run `gh pr view --json closingIssuesReferences -q .closingIssuesReferences` and confirm it lists <n>. It can return `[]` for about a minute after the PR opens; read it again before changing anything.
- If the PR ships only part of the issue, write `Refs #<n>` instead of `Closes #<n>`, and skip the check above. Comment on the issue as "Leave an issue open on purpose" in `docs/agents/issue-tracker.md` says. Keep the work that's left in this worktree (e.g. on its own branch), not in a session scratchpad, which may not outlast the session.
- Watch CI (`gh pr checks --watch`) until `verify` and Socket finish. Don't merge.

## When you finish (or get blocked)

End with one final message that contains:
1. PR URL and CI status.
2. What you built, file by file, in one line each.
3. The verify results.
4. `## Hiccups`: anything that failed, needed a retry, or that the issue or this prompt got wrong ("none" if there were none).

If you end a turn to wait on CI or a background task, start that message with the literal word `Waiting:` and say what you wait on, e.g. `Waiting: verify on PR #105, queued.` The orchestrator's wait script reads that word.

If you need a decision, stop and put the question in your final message. The orchestrator will answer it in this pane.
```
