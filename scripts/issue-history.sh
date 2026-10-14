#!/usr/bin/env bash
# What has already shipped for an issue. A PR can do an issue's work without
# closing it (`Refs #n`), so check before starting a worktree for it.
#
#   pnpm issue:history <n>
set -euo pipefail

if [ $# -ne 1 ] || ! [[ $1 =~ ^[0-9]+$ ]]; then
  echo "usage: $0 <issue-number>" >&2
  exit 2
fi
n=$1

gh issue view "$n" --json number,title,state,stateReason \
  --jq '"#\(.number) \(.state)\(if .state == "CLOSED" then " (\(.stateReason))" else "" end): \(.title)"'

echo
echo "PRs that mention #$n:"
prs=$(gh api --paginate "repos/{owner}/{repo}/issues/$n/timeline" \
  --jq '.[] | select(.event=="cross-referenced" and .source.issue.pull_request != null) | "PR #\(.source.issue.number) \(if .source.issue.pull_request.merged_at then "merged" else .source.issue.state end): \(.source.issue.title)"')
echo "${prs:-none}"

echo
echo "Commits on origin/main that mention #$n:"
git fetch --quiet origin main
# Not followed by a digit, so #1 doesn't match #12
commits=$(git log --oneline -E --grep="#$n([^0-9]|\$)" origin/main)
echo "${commits:-none}"
