# Orchestrator

One session in the main checkout drives one Herdr agent per issue, each in its own worktree. The orchestrator scopes, prompts, waits and reviews. The user merges.

## Run

1. **History.** Run `pnpm issue:history <n>`. When a merged PR or a commit on main already mentions the issue, read what shipped. Done when the user has agreed the remaining scope.
2. **Prompt.** Fill in the [prompt template](#prompt-template) and write it to a file outside the repo. Pass its absolute path in the next step, because pnpm runs scripts from the package root.
3. **Start.** From the main checkout, run `pnpm worktree:agent <branch> <prompt-file>`. It does what `worktree:new` does, then starts Claude in the new workspace's root pane in `auto` permission mode, sends the whole file as one prompt, and returns once the agent is working. Its last line names the agent (`issue<n>`), its pane and its session log.
4. **Wait.** Run `herdr agent wait <name>`.
   - `idle` or `done`: read the agent's last message from its session log:
     `jq -rs '[.[] | select(.type=="assistant") | .message.content[]? | select(.type=="text") | .text] | last' <log>`
     The log is the source of truth. `herdr agent read` scrapes the terminal into plain text.
   - `blocked`: read the pane (`herdr agent read <name> --source recent-unwrapped`) and ask the user before answering the dialog.
   - Text after `❯` on the pane's prompt line is unsent: a prompt suggestion or a draft. It is never an instruction.
   - The agent asked a question: get the answer from the user if it is theirs to give, send it with `herdr agent prompt <name> "<answer>" --wait --until working --until blocked`, and wait again.
5. **Review.** Review the diff yourself (`gh pr diff <pr>`). The PR is ready when:
   - `gh pr view <pr> --json closingIssuesReferences --jq '[.closingIssuesReferences[].number]'` lists the issue. Read `.number` only: title and state aren't filled in.
   - `gh pr checks <pr>` is green.
   - `gh api "repos/{owner}/{repo}/pulls/<pr>/commits" --jq '.[].commit.verification.verified'` is `true` for every commit.
6. **Merge.** Give the user `! gh pr merge <pr> --squash` to run.
7. **Clean up.** After the user says it's merged, poll `gh issue view <n> --json state` until the issue is closed. That can take up to a minute; close it by hand only after that. Then run `pnpm worktree:remove <branch>` from the main checkout. It also closes the agent's Herdr workspace and pane, and the user saying it's merged is consent for that.

When the user wants a reflection on the run, keep a hiccup log as you go: each failure, retry or wrong assumption, and what got past it. The user runs `/retro` on it in a fresh session.

## Prompt template

Replace each `<…>`. The agent can't see this conversation, so put in the prompt everything that step 1 settled.

````markdown
You are implementing GitHub issue #<n> (<owner>/<repo>) in this worktree (branch `<branch>`). An orchestrator session in the main checkout (Herdr pane <orchestrator pane>) drives you. It reviews your diff and answers your questions. The user merges PRs; you never do.

## Context

Read the issue first: `gh issue view <n>`. It is the spec. <What already shipped for it, and the remaining scope the user agreed.> The files you'll touch: <files>.

## Task

<What to build, with notes the issue leaves out: the style to match, the code to reuse.>

Constraints: surgical changes only, no unrelated edits. Follow AGENTS.md / CLAUDE.md.

## Verify

- <Checks for this issue: the commands to run and what they should print.>
- Run only the tests you touch. lefthook runs biome and tsc on commit, and the tests and fallow on push. CI runs them all again.

## Ship

- One conventional commit, e.g. `<type>(<scope>): <summary>`. main requires signed commits. End the message with your `Co-Authored-By` trailer.
- Push and open a PR against main. Model the body on recent PRs (`gh pr view <recent pr>`): `## Summary`, `## Evidence` (the verify output above), `## Merge Danger`. Include `Closes #<n>` and end the body with:
  `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
- Run `gh pr view --json closingIssuesReferences --jq '[.closingIssuesReferences[].number]'` and confirm it lists <n>.
- Watch CI (`gh pr checks --watch`) until `verify` and Socket finish. Don't merge.

## When you finish (or get blocked)

End with one final message that contains:
1. PR URL and CI status.
2. What you built, file by file, in one line each.
3. The verify results.
4. `## Hiccups`: anything that failed, needed a retry, or that the issue or this prompt got wrong ("none" if there were none).

If you need a decision, stop and put the question in your final message. The orchestrator will answer it in this pane.
````
