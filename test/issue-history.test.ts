import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = resolve('scripts/issue-history.sh');
const WARNING =
  'warning: this clone is shallow, so the commit list may miss older commits; run git fetch --unshallow to fix it\n';

// Stands in for gh, as test/worktree/bin/gh does for the worktree script: the
// issue title, then no Agent Brief edit and no PRs
const GH = `#!/usr/bin/env bash
case "$1 $2" in
  'issue view') echo '#9124 OPEN: Stub issue' ;;
esac
`;

let dir: string;

beforeEach(() => {
  // On macOS the temp folder is under /var, a symlink to /private/var
  dir = realpathSync(mkdtempSync(join(tmpdir(), 'issue-history-test-')));
  mkdirSync(join(dir, 'bin'));
  writeFileSync(join(dir, 'bin/gh'), GH, { mode: 0o755 });
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

// env -i, as in test/worktree.test.ts: no GIT_DIR from a git hook, no signing
// or identity from the user's git config, and the stub gh first on PATH
function run(cmd: string[], cwd = dir) {
  return spawnSync(
    'env',
    [
      '-i',
      `PATH=${join(dir, 'bin')}${delimiter}${process.env.PATH}`,
      `HOME=${dir}`,
      'GIT_CONFIG_NOSYSTEM=1',
      'GIT_AUTHOR_NAME=Test',
      'GIT_AUTHOR_EMAIL=test@example.com',
      'GIT_COMMITTER_NAME=Test',
      'GIT_COMMITTER_EMAIL=test@example.com',
      ...cmd,
    ],
    { cwd, encoding: 'utf8', timeout: 20_000 }
  );
}

function git(args: string[], cwd = dir) {
  const result = run(['git', ...args], cwd);
  expect(result.stderr).toBe('');
  return result.stdout;
}

// origin's main has the issue's commit below the tip, so a depth-1 clone
// misses it
function cloneOrigin(depth: string[]) {
  const origin = join(dir, 'origin');
  git(['init', '--quiet', '-b', 'main', origin]);
  for (const message of ['first', 'feat: stub (#9124)', 'tip']) {
    git(['commit', '--quiet', '--allow-empty', '-m', message], origin);
  }
  const clone = join(dir, 'clone');
  git(['clone', '--quiet', ...depth, `file://${origin}`, clone]);
  return clone;
}

describe('issue-history.sh', () => {
  it('warns on stderr when the clone is shallow', () => {
    const clone = cloneOrigin(['--depth', '1']);
    expect(git(['rev-parse', '--is-shallow-repository'], clone)).toBe('true\n');

    const result = run(['bash', SCRIPT, '9124'], clone);

    expect(result).toMatchObject({
      status: 0,
      stdout:
        '#9124 OPEN: Stub issue\n\nPRs that mention #9124:\nnone\n\nCommits on origin/main that mention #9124:\nnone\n',
      stderr: WARNING,
    });
  });

  it('prints no warning, and lists the commit, in a full clone', () => {
    const clone = cloneOrigin([]);
    const hash = git(['rev-parse', '--short', 'HEAD~1'], clone).trim();

    const result = run(['bash', SCRIPT, '9124'], clone);

    expect(result).toMatchObject({
      status: 0,
      stdout: `#9124 OPEN: Stub issue\n\nPRs that mention #9124:\nnone\n\nCommits on origin/main that mention #9124:\n${hash} feat: stub (#9124)\n`,
      stderr: '',
    });
  });
});
