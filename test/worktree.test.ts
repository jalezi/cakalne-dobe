import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = resolve('scripts/worktree.sh');
const BIN = resolve('test/worktree/bin');
// Where Claude Code keeps the logs for the stub herdr's cwd,
// /stub/repo.worktrees/fix-9103-x
const LOGS = '.claude/projects/-stub-repo-worktrees-fix-9103-x';

const USAGE = `usage: ${SCRIPT} new|remove <branch>
       ${SCRIPT} remove <branch> --discard
       ${SCRIPT} agent <branch> <prompt-file>
       ${SCRIPT} wait <agent>
`;
const REPORT =
  '## Final report: #9103\n\nPR #9104 is open.\n\n## Hiccups\n\nNone.';
const FOLLOW_UP =
  'Orchestrator here. CI is green; one more round: rename the stub.';
const NO_REPLY = "issue9103 hasn't replied since the last prompt\n";
const WAITING = 'Waiting: verify on PR #9104, queued.';

let dir: string;

beforeEach(() => {
  // On macOS the temp folder is under /var, a symlink to /private/var, and git
  // prints worktree paths with the real one
  dir = realpathSync(mkdtempSync(join(tmpdir(), 'worktree-test-')));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

// For env -i, which starts from an empty environment, with the stubs first on
// PATH: run from a Herdr pane, an inherited HERDR_ENV would reach every case,
// and from a git hook, an inherited GIT_DIR would point git at this repo. HOME
// keeps the session logs, and git's user config, in the temp folder.
function env(herdr = false) {
  return [
    `PATH=${BIN}${delimiter}${process.env.PATH}`,
    `HOME=${dir}`,
    `STUB_DIR=${dir}`,
    ...(herdr ? ['HERDR_ENV=1'] : []),
    // No commit signing from the system config, and CI has no git identity
    'GIT_CONFIG_NOSYSTEM=1',
    'GIT_AUTHOR_NAME=Test',
    'GIT_AUTHOR_EMAIL=test@example.com',
    'GIT_COMMITTER_NAME=Test',
    'GIT_COMMITTER_EMAIL=test@example.com',
  ];
}

function run(args: string[], { herdr = false, cwd = dir } = {}) {
  // spawnSync blocks the event loop, so a test's own timeout can't stop a
  // script that never returns. The slowest case takes about 7 s.
  return spawnSync('env', ['-i', ...env(herdr), 'bash', SCRIPT, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 20_000,
  });
}

function calls() {
  const file = join(dir, 'calls');
  return existsSync(file)
    ? readFileSync(file, 'utf8').split('\n').filter(Boolean)
    : [];
}

describe('the argument check', () => {
  it.each([
    '',
    'frob fix/9103-x',
    'new',
    'new fix/9103-x extra',
    'new fix/9103-x --discard',
    'remove',
    'remove fix/9103-x --dicsard',
    'remove --discard fix/9103-x',
    'remove fix/9103-x --discard extra',
    'agent fix/9103-x',
    'agent fix/9103-x prompt.md extra',
    'wait',
    'wait issue9103 extra',
  ])('prints the usage and exits 2 for "%s"', (args) => {
    expect(run(args.split(' ').filter(Boolean))).toMatchObject({
      status: 2,
      stdout: '',
      stderr: USAGE,
    });
  });

  it('exits 2 before anything is created for an agent branch without an issue number', () => {
    expect(
      run(['agent', 'test/no-number', '/dev/null'], { herdr: true })
    ).toMatchObject({
      status: 2,
      stdout: '',
      stderr:
        'agent needs a <type>/<n>-<slug> branch, to name the agent issue<n>\n',
    });
    expect(calls()).toEqual([]);
  });
});

// Session log entries, in the fields wait reads
function user(kind: string, content: string) {
  return { type: 'user', origin: { kind }, message: { role: 'user', content } };
}

function text(value: string) {
  return {
    type: 'assistant',
    message: { role: 'assistant', content: [{ type: 'text', text: value }] },
  };
}

const PROMPT = user('human', 'Implement #9103');
const NOTIFICATION = user('task-notification', '<task-notification>CI done');
const PEER = { ...user('peer', 'A message from w9:pG'), isMeta: true };
// Real assistant entries also carry tool_use blocks, which have no text
const TOOL_USE = {
  type: 'assistant',
  message: {
    role: 'assistant',
    content: [
      {
        type: 'tool_use',
        id: 'toolu_1',
        name: 'Bash',
        input: { command: 'pnpm test' },
      },
    ],
  },
};

function jsonl(...entries: object[]) {
  return entries.map((entry) => `${JSON.stringify(entry)}\n`).join('');
}

function writeLog(session: string, content: string) {
  mkdirSync(join(dir, LOGS), { recursive: true });
  writeFileSync(join(dir, LOGS, `${session}.jsonl`), content);
}

// One "<status> <session>" line per herdr agent get; the last line repeats
function writeChecks(...lines: string[]) {
  writeFileSync(join(dir, 'checks'), lines.map((line) => `${line}\n`).join(''));
}

// Appended to the session log just before check n
function appendBefore(n: number, content: string) {
  writeFileSync(join(dir, `append-${n}`), content);
}

function checks() {
  return calls().filter((call) => call === 'herdr agent get issue9103').length;
}

function wait() {
  return run(['wait', 'issue9103'], { herdr: true });
}

describe('wait', () => {
  it('exits 1 outside Herdr', () => {
    expect(run(['wait', 'issue9103'])).toMatchObject({
      status: 1,
      stdout: '',
      stderr: 'wait needs Herdr (HERDR_ENV=1)\n',
    });
    expect(calls()).toEqual([]);
  });

  it('prints the report and exits 0 once the agent is done', () => {
    writeLog('s1', jsonl(PROMPT, TOOL_USE, text(REPORT)));
    writeChecks('working s1', 'working s1', 'done s1');

    expect(wait()).toMatchObject({
      status: 0,
      stdout: `${REPORT}\n`,
      stderr: '',
    });
    expect(checks()).toBe(3);
  });

  it('prints the pane and exits 3 when the agent is blocked', () => {
    writeLog('s1', jsonl(PROMPT));
    writeChecks('working s1', 'blocked s1');
    writeFileSync(join(dir, 'pane'), ' Do you want to proceed?\n ❯ 1. Yes\n');

    expect(wait()).toMatchObject({
      status: 3,
      stdout: ' Do you want to proceed?\n ❯ 1. Yes\n',
      stderr: '',
    });
    expect(calls()).toEqual([
      'herdr agent get issue9103',
      'sleep 30',
      'herdr agent get issue9103',
      'herdr agent read issue9103 --source recent-unwrapped',
    ]);
  });

  // Only the last text sets the limit, so the Waiting: before it gets 4 checks
  it('prints the last text and exits 4 after 4 idle checks without a report', () => {
    const status = "I'm waiting on CI for PR #9104. This is a status update.";
    writeLog('s1', jsonl(PROMPT, text(WAITING), text(status)));
    writeChecks('idle s1');

    expect(wait()).toMatchObject({
      status: 4,
      stdout: `${status}\n`,
      stderr: '',
    });
    expect(calls()).toEqual([
      'herdr agent get issue9103',
      'sleep 30',
      'herdr agent get issue9103',
      'sleep 30',
      'herdr agent get issue9103',
      'sleep 30',
      'herdr agent get issue9103',
    ]);
  });

  // 120 checks or more, each a few processes: slower than vitest's 5 s default
  it.each([
    ['Waiting:', 120, WAITING],
    ['Waiting: after leading whitespace', 120, `\n\n  ${WAITING}`],
    ['**Waiting:**', 4, '**Waiting:** verify on PR #9104, queued.'],
  ])('allows %s %i idle checks', { timeout: 30_000 }, (_, limit, last) => {
    writeLog('s1', jsonl(PROMPT, text(last)));
    writeChecks('idle s1');

    expect(wait()).toMatchObject({
      status: 4,
      stdout: `${last}\n`,
      stderr: '',
    });
    expect(checks()).toBe(limit);
  });

  it('starts the Waiting: count again after a working check', {
    timeout: 30_000,
  }, () => {
    writeLog('s1', jsonl(PROMPT, text(WAITING)));
    writeChecks(...Array(60).fill('idle s1'), 'working s1', 'idle s1');

    expect(wait()).toMatchObject({
      status: 4,
      stdout: `${WAITING}\n`,
      stderr: '',
    });
    expect(checks()).toBe(181);
  });

  it('ignores the report from before a follow-up prompt', () => {
    writeLog('s1', jsonl(PROMPT, text(REPORT), user('human', FOLLOW_UP)));
    writeChecks('idle s1');

    expect(wait()).toMatchObject({ status: 4, stdout: NO_REPLY, stderr: '' });
    expect(checks()).toBe(4);
  });

  it('prints the report that follows a follow-up prompt', () => {
    const second = 'PR #9104 is updated.\n\n## Hiccups\n\nNone.';
    writeLog('s1', jsonl(PROMPT, text(REPORT), user('human', FOLLOW_UP)));
    appendBefore(3, jsonl(text(second)));
    writeChecks('idle s1', 'idle s1', 'working s1', 'idle s1');

    expect(wait()).toMatchObject({
      status: 0,
      stdout: `${second}\n`,
      stderr: '',
    });
    expect(checks()).toBe(4);
  });

  it('allows only 4 idle checks for a Waiting: from before a follow-up prompt', () => {
    writeLog('s1', jsonl(PROMPT, text(WAITING), user('human', FOLLOW_UP)));
    writeChecks('idle s1');

    expect(wait()).toMatchObject({ status: 4, stdout: NO_REPLY, stderr: '' });
    expect(checks()).toBe(4);
  });

  // Only .origin.kind tells these user entries from a prompt. The last case
  // also fails a check that reads only the last text.
  it.each([
    ['a task notification', [NOTIFICATION]],
    ['a peer message', [PEER]],
    ['a notification, then a later text', [NOTIFICATION, text('CI is green.')]],
  ])('prints the report followed by %s', (_, after) => {
    writeLog('s1', jsonl(PROMPT, text(REPORT), ...after));
    writeChecks('idle s1');

    expect(wait()).toMatchObject({
      status: 0,
      stdout: `${REPORT}\n`,
      stderr: '',
    });
    expect(checks()).toBe(1);
  });

  it('skips a half-written last line until it is complete', () => {
    const line = JSON.stringify(text(REPORT));
    writeLog('s1', jsonl(PROMPT) + line.slice(0, 40));
    appendBefore(3, `${line.slice(40)}\n`);
    writeChecks('idle s1');

    expect(wait()).toMatchObject({
      status: 0,
      stdout: `${REPORT}\n`,
      stderr: '',
    });
    expect(checks()).toBe(3);
  });

  it('reads the new session after a /clear', () => {
    writeLog('s1', jsonl(PROMPT, text(REPORT)));
    writeLog('s2', jsonl(user('human', FOLLOW_UP)));
    writeChecks('working s1', 'idle s2');

    expect(wait()).toMatchObject({ status: 4, stdout: NO_REPLY, stderr: '' });
    expect(checks()).toBe(5);
  });

  it('exits 4 after 4 idle checks when there is no log yet', () => {
    writeChecks('idle s1');

    expect(wait()).toMatchObject({ status: 4, stdout: NO_REPLY, stderr: '' });
    expect(checks()).toBe(4);
  });

  it("passes on herdr's error and exits 1 for an unknown name", () => {
    expect(run(['wait', 'nosuchagent'], { herdr: true })).toMatchObject({
      status: 1,
      stdout: '',
      stderr:
        '{"error":{"code":"agent_not_found","message":"agent target nosuchagent not found"},"id":"cli:agent:get"}\n',
    });
    expect(calls()).toEqual(['herdr agent get nosuchagent']);
  });
});

describe('remove', () => {
  const BRANCH = 'fix/9103-x';
  const LIST = `gh pr list --head ${BRANCH} --state all --json number --jq map("#\\(.number)") | join(", ")`;
  const VIEW = `gh pr view ${BRANCH} --json state,number,headRefOid --jq "\\(.state) \\(.number) \\(.headRefOid)"`;
  let repo: string;
  let worktree: string;

  function git(cwd: string, ...args: string[]) {
    return execFileSync('env', ['-i', ...env(), 'git', ...args], {
      cwd,
      encoding: 'utf8',
    });
  }

  function expectKept() {
    expect(git(repo, 'worktree', 'list', '--porcelain')).toContain(
      `worktree ${worktree}\n`
    );
    expect(git(repo, 'branch', '--list', BRANCH)).toContain(BRANCH);
  }

  function remove(...flags: string[]) {
    return run(['remove', BRANCH, ...flags], { cwd: repo });
  }

  // The worktree is at the path the script expects, beside the repo, as
  // worktree:new makes it. The push also sets origin/main.
  beforeEach(() => {
    repo = join(dir, 'repo');
    worktree = join(dir, 'repo.worktrees/fix-9103-x');
    git(
      dir,
      'init',
      '--quiet',
      '--bare',
      '--initial-branch=main',
      'origin.git'
    );
    git(dir, 'init', '--quiet', '--initial-branch=main', 'repo');
    git(repo, 'commit', '--quiet', '--allow-empty', '--message', 'init');
    git(repo, 'remote', 'add', 'origin', join(dir, 'origin.git'));
    git(repo, 'push', '--quiet', 'origin', 'main');
    git(
      repo,
      'worktree',
      'add',
      '--quiet',
      '--no-track',
      '-b',
      BRANCH,
      worktree,
      'origin/main'
    );
  });

  it('--discard removes the worktree and the branch with no PR and no commits', () => {
    const tip = git(repo, 'rev-parse', '--short', BRANCH).trim();

    expect(remove('--discard')).toMatchObject({
      status: 0,
      stdout: `Deleted branch ${BRANCH} (was ${tip}).\nRemoved ${worktree}\n`,
      stderr: '',
    });
    expect(git(repo, 'worktree', 'list', '--porcelain')).not.toContain(
      worktree
    );
    expect(git(repo, 'branch', '--list', BRANCH)).toBe('');
    expect(calls()).toEqual([LIST]);
  });

  it('--discard refuses a branch with a PR', () => {
    writeFileSync(join(dir, 'gh-pr-list'), '#9104\n');

    expect(remove('--discard')).toMatchObject({
      status: 1,
      stdout: '',
      stderr: `${BRANCH} has a PR (#9104); --discard is only for a branch without one\n`,
    });
    expectKept();
    expect(calls()).toEqual([LIST]);
  });

  // Read as "no PR", a gh failure would let the commit check remove the worktree
  it('--discard refuses when gh fails', () => {
    writeFileSync(join(dir, 'gh-offline'), '');

    expect(remove('--discard')).toMatchObject({
      status: 1,
      stdout: '',
      stderr: `error connecting to api.github.com\ncheck your internet connection or https://githubstatus.com\ngh failed, so --discard can't tell whether ${BRANCH} has a PR\n`,
    });
    expectKept();
    expect(calls()).toEqual([LIST]);
  });

  it('--discard refuses a branch with a commit beyond origin/main', () => {
    git(worktree, 'commit', '--quiet', '--allow-empty', '--message', 'wip');

    expect(remove('--discard')).toMatchObject({
      status: 1,
      stdout: '',
      stderr: `${BRANCH} has 1 commit(s) beyond origin/main; --discard would lose them\n`,
    });
    expectKept();
    expect(calls()).toEqual([LIST]);
  });

  it('--discard refuses uncommitted changes, before it asks gh', () => {
    writeFileSync(join(worktree, 'throwaway.txt'), '');

    expect(remove('--discard')).toMatchObject({
      status: 1,
      stdout: '',
      stderr: `${worktree} has uncommitted changes; commit or discard them first\n`,
    });
    expectKept();
    expect(calls()).toEqual([]);
  });

  // The PR's head is on origin and holds the tip, so only the state refuses
  it('refuses a branch whose PR is open, without --discard', () => {
    const tip = git(repo, 'rev-parse', BRANCH).trim();
    git(repo, 'push', '--quiet', 'origin', `${BRANCH}:refs/pull/9104/head`);
    writeFileSync(join(dir, 'gh-pr-view'), `OPEN 9104 ${tip}\n`);

    expect(remove()).toMatchObject({
      status: 1,
      stdout: '',
      stderr: `${BRANCH} is not the head of a merged PR; remove the worktree by hand if you mean to drop it\n`,
    });
    expectKept();
    expect(calls()).toEqual([VIEW]);
  });
});
