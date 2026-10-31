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

# `gh issue view --json` has no lastEditedAt. A PR number resolves to {} here.
# Only an open issue is checked: closing ticks boxes in the body, often after
# the brief.
gh api graphql -F owner='{owner}' -F repo='{repo}' -F n="$n" -f query='
  query($owner: String!, $repo: String!, $n: Int!) {
    repository(owner: $owner, name: $repo) {
      issueOrPullRequest(number: $n) {
        ... on Issue {
          state
          lastEditedAt
          comments(first: 100) { nodes { body createdAt lastEditedAt } }
        }
      }
    }
  }' --jq '
  def utc: fromdateiso8601 | strftime("%Y-%m-%d %H:%M UTC");
  .data.repository.issueOrPullRequest | select(.state == "OPEN")
  | ([.comments.nodes[] | select(.body | test("(^|\n)## Agent Brief")) | .lastEditedAt // .createdAt] | max) as $brief
  | select($brief != null and .lastEditedAt != null and .lastEditedAt > $brief)
  | "Body edited \(.lastEditedAt | utc), after the Agent Brief (\($brief | utc)): compare them before trusting the brief."'

echo
echo "PRs that mention #$n:"
prs=$(gh api --paginate "repos/{owner}/{repo}/issues/$n/timeline" \
  --jq '.[] | select(.event=="cross-referenced" and .source.issue.pull_request != null) | "PR #\(.source.issue.number) \(if .source.issue.pull_request.merged_at then "merged" else .source.issue.state end): \(.source.issue.title)"')
echo "${prs:-none}"

echo
echo "Commits on origin/main that mention #$n:"
git fetch --quiet origin main
if [ "$(git rev-parse --is-shallow-repository)" = true ]; then
  echo "warning: this clone is shallow, so the commit list may miss older commits; run git fetch --unshallow to fix it" >&2
fi
# Not followed by a digit, so #1 doesn't match #12
commits=$(git log --oneline -E --grep="#$n([^0-9]|\$)" origin/main)
echo "${commits:-none}"
