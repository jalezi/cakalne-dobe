#!/usr/bin/env bash
# One worktree per issue, so several issues can be worked on at the same time.
# Inside Herdr (HERDR_ENV=1) each worktree also gets its own Herdr workspace.
#
#   pnpm worktree:new <branch>      e.g. pnpm worktree:new fix/29-import-db-reason
#   pnpm worktree:remove <branch>   once the branch's PR is merged
#
# Worktrees live beside the repo, in <repo>.worktrees/. Inside the repo,
# tsc and vitest would pick up their copies of the code and tests.
set -euo pipefail

if [ $# -ne 2 ]; then
  echo "usage: $0 new|remove <branch>" >&2
  exit 2
fi
action=$1
branch=$2
git check-ref-format --branch "$branch" >/dev/null

# The main checkout, also when run from inside a worktree
main=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
path="$main.worktrees/${branch//\//-}"

case $action in
  new)
    git -C "$main" fetch --quiet origin main
    if [ "${HERDR_ENV:-}" = 1 ]; then
      herdr worktree create --cwd "$main" --branch "$branch" --base origin/main \
        --path "$path" --label "$branch" --no-focus |
        jq -r '.result | "Herdr workspace: \(.workspace.workspace_id), root pane: \(.root_pane.pane_id)"'
      # Herdr tracks the base; the branch gets its own upstream on the first push
      git -C "$path" branch --quiet --unset-upstream
    else
      git -C "$main" worktree add --quiet --no-track -b "$branch" "$path" origin/main
    fi
    pnpm --dir "$path" install --frozen-lockfile
    # Only holds the local `turso dev` URL; needed by `pnpm dev` and the db:local scripts.
    # .env.production.local stays in the main checkout.
    if [ -f "$main/.env.development.local" ]; then
      cp "$main/.env.development.local" "$path/"
    fi
    # Job artifacts for the seed scripts (about 1 GB), shared rather than copied
    if [ -d "$main/mock-data" ]; then
      ln -s "$main/mock-data" "$path/mock-data"
    fi
    echo "Worktree ready: $path"
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
  *)
    echo "usage: $0 new|remove <branch>" >&2
    exit 2
    ;;
esac
