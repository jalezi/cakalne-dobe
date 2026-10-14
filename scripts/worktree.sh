#!/usr/bin/env bash
# One worktree per issue, so several issues can be worked on at the same time.
# Inside Herdr (HERDR_ENV=1) each worktree also gets its own Herdr workspace.
#
#   pnpm worktree:new <branch>      e.g. pnpm worktree:new fix/29-import-db-reason
#   pnpm worktree:agent <branch> <prompt-file>
#                                   new, then a Claude agent in Herdr gets the prompt
#   pnpm worktree:remove <branch>   once the branch's PR is merged
#
# Worktrees live beside the repo, in <repo>.worktrees/. Inside the repo,
# tsc and vitest would pick up their copies of the code and tests.
set -euo pipefail

case ${1:-}:$# in
  new:2 | remove:2 | agent:3) ;;
  *)
    echo "usage: $0 new|remove <branch>" >&2
    echo "       $0 agent <branch> <prompt-file>" >&2
    exit 2
    ;;
esac
action=$1
branch=$2
git check-ref-format --branch "$branch" >/dev/null

# Checked before anything is created: worktree:remove won't clean up a
# worktree whose branch has no merged PR
if [ "$action" = agent ]; then
  if [ "${HERDR_ENV:-}" != 1 ]; then
    echo "agent needs Herdr (HERDR_ENV=1)" >&2
    exit 1
  fi
  if ! [[ $branch =~ ^[a-z]+/([0-9]+)- ]]; then
    echo "agent needs a <type>/<n>-<slug> branch, to name the agent issue<n>" >&2
    exit 2
  fi
  name=issue${BASH_REMATCH[1]}
  prompt=$(cat "$3")
fi

# The main checkout, also when run from inside a worktree
main=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
path="$main.worktrees/${branch//\//-}"

case $action in
  new | agent)
    git -C "$main" fetch --quiet origin main
    ready="Worktree ready: $path"
    if [ "${HERDR_ENV:-}" = 1 ]; then
      created=$(herdr worktree create --cwd "$main" --branch "$branch" --base origin/main \
        --path "$path" --label "$branch" --no-focus)
      workspace=$(jq -r .result.workspace.workspace_id <<<"$created")
      pane=$(jq -r .result.root_pane.pane_id <<<"$created")
      # On the last line, so `| tail` keeps them
      ready+=" (Herdr workspace: $workspace, root pane: $pane)"
      # Herdr tracks the base; the branch gets its own upstream on the first push
      git -C "$path" branch --quiet --unset-upstream
    else
      git -C "$main" worktree add --quiet --no-track -b "$branch" "$path" origin/main
    fi
    pnpm --dir "$path" install --frozen-lockfile --loglevel error
    # Its own database, so schema pushes and reseeds stay in this worktree. The
    # app and scripts open the file: a `turso dev` here would clash with the
    # main checkout's on port 8080. No env file comes from the main checkout.
    echo 'DATABASE_URL=file:dev.db' > "$path/.env.development.local"
    if [ -f "$main/dev.db" ]; then
      # Under the main checkout's write lock, its `turso dev` can't add to or
      # reset the WAL. A checkpoint may still copy WAL pages into dev.db, so
      # dev.db alone can be torn, but dev.db and the WAL together can't.
      node -e '
        const { execFileSync } = require("node:child_process");
        const { existsSync } = require("node:fs");
        const { DatabaseSync } = require("node:sqlite");
        const [from, to] = process.argv.slice(1);
        // Instant clones on APFS, Btrfs or XFS, sharing disk space until one
        // copy changes; both flags fall back to a plain copy
        const cloneFlag = process.platform === "darwin" ? "-c" : "--reflink=auto";
        const db = new DatabaseSync(from, { timeout: 10000 });
        db.exec("BEGIN IMMEDIATE");
        for (const suffix of ["", "-wal"]) {
          if (existsSync(from + suffix)) {
            execFileSync("cp", [cloneFlag, from + suffix, to + suffix]);
          }
        }
        db.exec("ROLLBACK");
      ' "$main/dev.db" "$path/dev.db"
    else
      # Nothing to clone: start empty, with the schema
      pnpm --dir "$path" drizzle:local:push
    fi
    # Job artifacts for the seed scripts (about 1 GB), shared rather than copied
    if [ -d "$main/mock-data" ]; then
      ln -s "$main/mock-data" "$path/mock-data"
    fi
    echo "$ready"
    if [ "$action" = agent ]; then
      session=$(herdr agent start "$name" --kind claude --pane "$pane" -- --permission-mode auto |
        jq -er '.result.agent.agent_session.value')
      # Returns once the agent is working on it, or stuck at a dialog
      herdr agent prompt "$name" "$prompt" --wait --until working --until blocked >/dev/null
      echo "Agent $name in pane $pane, session log: $HOME/.claude/projects/${path//[^a-zA-Z0-9]/-}/$session.jsonl"
    fi
    ;;
  remove)
    if ! git -C "$main" worktree list --porcelain | grep -qxF "worktree $path"; then
      echo "No worktree for $branch at $path" >&2
      exit 1
    fi
    if [ "$(git rev-parse --show-toplevel)" = "$path" ]; then
      echo "Run this from the main checkout ($main), not from the worktree it removes" >&2
      exit 1
    fi
    if [ -n "$(git -C "$path" status --porcelain)" ]; then
      echo "$path has uncommitted changes; commit or discard them first" >&2
      exit 1
    fi
    # Squash merges leave the branch unmerged in git's eyes, so GitHub decides.
    # The tip must be the merged PR's head, or commits made after it would be lost.
    pr=$(gh pr view "$branch" --json state,headRefOid --jq '"\(.state) \(.headRefOid)"' || true)
    if [ "$pr" != "MERGED $(git -C "$main" rev-parse "refs/heads/$branch")" ]; then
      echo "$branch is not the head of a merged PR; remove the worktree by hand if you mean to drop it" >&2
      exit 1
    fi
    workspace=""
    if [ "${HERDR_ENV:-}" = 1 ]; then
      workspace=$(herdr worktree list --cwd "$main" |
        jq -r --arg path "$path" '.result.worktrees[] | select(.path == $path) | .open_workspace_id // empty')
      # Closing the caller's own workspace would kill this script partway
      if [ -n "$workspace" ] && [ "$workspace" = "${HERDR_WORKSPACE_ID:-}" ]; then
        echo "Run this from the main checkout's workspace, not from $workspace, which it closes" >&2
        exit 1
      fi
    fi
    if [ -n "$workspace" ]; then
      herdr worktree remove --workspace "$workspace" >/dev/null
    else
      git -C "$main" worktree remove "$path"
    fi
    git -C "$main" branch -D "$branch"
    echo "Removed $path"
    ;;
esac
