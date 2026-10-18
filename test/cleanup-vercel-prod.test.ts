import { execFileSync } from 'node:child_process';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  getDeployments,
  main,
  selectDeletions,
} from '../scripts/cleanup-vercel-prod';

// The script deletes real deployments: no test may reach the vercel CLI
vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }));

interface Deployment {
  createdAt?: number;
  ready?: number;
  state?: string;
  url: string;
}

const NEWEST = { url: 'newest.vercel.app', ready: 3000 };
const OLDER = { url: 'older.vercel.app', ready: 2000 };
const OLDEST = { url: 'oldest.vercel.app', ready: 1000 };
const PREVIEW_READY = { url: 'preview-a.vercel.app', state: 'READY' };
const PREVIEW_UNKNOWN = { url: 'preview-b.vercel.app' };

// Answers `vercel list` per environment and records every command
function fakeVercel(production: Deployment[], preview: Deployment[]) {
  return vi.fn((args: string[]) => {
    if (args[0] === 'remove') {
      return '';
    }

    const environment = args[args.indexOf('--environment') + 1];

    return JSON.stringify({
      deployments: environment === 'production' ? production : preview,
    });
  });
}

function removeCalls(run: ReturnType<typeof fakeVercel>) {
  return run.mock.calls
    .map(([args]) => args)
    .filter((args) => args[0] === 'remove');
}

beforeAll(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  expect(execFileSync).not.toHaveBeenCalled();
});

describe('cleanup-vercel-prod', () => {
  it('runs nothing when imported', () => {
    expect(execFileSync).not.toHaveBeenCalled();
  });
});

describe('selectDeletions', () => {
  it('keeps the newest production deployment and selects the rest', () => {
    const { keep, deletions } = selectDeletions(
      [NEWEST, OLDER, OLDEST],
      [PREVIEW_READY, PREVIEW_UNKNOWN]
    );

    expect(keep).toBe(NEWEST);
    expect(deletions).toEqual([
      { deployment: OLDER, label: 'older READY production deployment' },
      { deployment: OLDEST, label: 'older READY production deployment' },
      { deployment: PREVIEW_READY, label: 'preview deployment (READY)' },
      { deployment: PREVIEW_UNKNOWN, label: 'preview deployment (UNKNOWN)' },
    ]);
  });

  it('selects every preview deployment when there is no production one', () => {
    const { keep, deletions } = selectDeletions(
      [],
      [PREVIEW_READY, PREVIEW_UNKNOWN]
    );

    expect(keep).toBeUndefined();
    expect(deletions.map(({ deployment }) => deployment)).toEqual([
      PREVIEW_READY,
      PREVIEW_UNKNOWN,
    ]);
  });
});

describe('getDeployments', () => {
  it('follows pagination.next and sorts newest first', () => {
    const run = vi
      .fn<(args: string[]) => string>()
      .mockReturnValueOnce(
        JSON.stringify({ deployments: [OLDEST], pagination: { next: 111 } })
      )
      .mockReturnValueOnce(
        JSON.stringify({
          deployments: [
            { url: 'untimed.vercel.app' },
            { url: 'created.vercel.app', createdAt: 2000 },
            { url: '' },
            NEWEST,
          ],
        })
      );

    const deployments = getDeployments(
      { environment: 'production', status: 'READY' },
      run
    );

    const firstPage = [
      'list',
      '--environment',
      'production',
      '--status',
      'READY',
      '--format',
      'json',
    ];

    expect(run.mock.calls).toEqual([
      [firstPage],
      [[...firstPage, '--next', '111']],
    ]);
    expect(deployments.map(({ url }) => url)).toEqual([
      'newest.vercel.app',
      'created.vercel.app',
      'oldest.vercel.app',
      'untimed.vercel.app',
    ]);
  });
});

describe('main', () => {
  it('removes older production and every preview deployment, keeping the newest', () => {
    const run = fakeVercel(
      [OLDER, NEWEST, OLDEST],
      [PREVIEW_READY, PREVIEW_UNKNOWN]
    );

    main([], run);

    expect(removeCalls(run)).toEqual([
      ['remove', 'older.vercel.app', '--yes', '--safe'],
      ['remove', 'oldest.vercel.app', '--yes', '--safe'],
      ['remove', 'preview-a.vercel.app', '--yes', '--safe'],
      ['remove', 'preview-b.vercel.app', '--yes', '--safe'],
    ]);
  });

  it('lists only READY production deployments and every preview deployment', () => {
    const run = fakeVercel([NEWEST], []);

    main([], run);

    expect(run.mock.calls).toEqual([
      [
        [
          'list',
          '--environment',
          'production',
          '--status',
          'READY',
          '--format',
          'json',
        ],
      ],
      [['list', '--environment', 'preview', '--format', 'json']],
    ]);
  });

  it('never calls remove on a dry run', () => {
    const run = fakeVercel([NEWEST, OLDER], [PREVIEW_READY]);

    main(['--dry-run'], run);

    expect(run).toHaveBeenCalledTimes(2);
    expect(removeCalls(run)).toEqual([]);
  });

  it('drops --safe with --unsafe', () => {
    const run = fakeVercel([NEWEST, OLDER], [PREVIEW_READY]);

    main(['--unsafe'], run);

    expect(removeCalls(run)).toEqual([
      ['remove', 'older.vercel.app', '--yes'],
      ['remove', 'preview-a.vercel.app', '--yes'],
    ]);
  });

  it('removes every preview deployment when there is no production one', () => {
    const run = fakeVercel([], [PREVIEW_READY, PREVIEW_UNKNOWN]);

    main([], run);

    expect(removeCalls(run)).toEqual([
      ['remove', 'preview-a.vercel.app', '--yes', '--safe'],
      ['remove', 'preview-b.vercel.app', '--yes', '--safe'],
    ]);
  });

  it('removes nothing when only the newest production deployment exists', () => {
    const run = fakeVercel([NEWEST], []);

    main([], run);

    expect(removeCalls(run)).toEqual([]);
  });
});
