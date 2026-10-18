#!/usr/bin/env node

/** biome-ignore-all lint/suspicious/noConsole: This is a CLI script */

import { execFileSync } from 'node:child_process';

interface VercelDeployment {
  createdAt?: number;
  name?: string;
  ready?: number;
  state?: string;
  target?: string;
  url: string;
}

interface VercelPagination {
  next?: number;
}

interface VercelListResponse {
  deployments?: VercelDeployment[];
  pagination?: VercelPagination;
}

interface CleanupOptions {
  dryRun: boolean;
  safe: boolean;
}

interface GetDeploymentsOptions {
  environment: 'preview' | 'production';
  status?: string;
}

interface Deletion {
  deployment: VercelDeployment;
  label: string;
}

type CommandRunner = (args: string[]) => string;

function parseArgs(args: string[]): CleanupOptions {
  return {
    dryRun: args.includes('--dry-run'),
    safe: !args.includes('--unsafe'),
  };
}

function runVercelCommand(args: string[]): string {
  return execFileSync('vercel', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
}

export function getDeployments(
  { environment, status }: GetDeploymentsOptions,
  run: CommandRunner
): VercelDeployment[] {
  const deployments: VercelDeployment[] = [];
  let next: number | undefined;

  do {
    const args = ['list', '--environment', environment, '--format', 'json'];

    if (status) {
      args.splice(3, 0, '--status', status);
    }

    if (next) {
      args.push('--next', String(next));
    }

    const output = run(args);
    const parsed = JSON.parse(output) as VercelListResponse;

    deployments.push(
      ...(parsed.deployments ?? []).filter((deployment) => deployment.url)
    );
    next = parsed.pagination?.next;
  } while (next);

  return deployments.sort((left, right) => {
    const leftTimestamp = left.ready ?? left.createdAt ?? 0;
    const rightTimestamp = right.ready ?? right.createdAt ?? 0;

    return rightTimestamp - leftTimestamp;
  });
}

function removeDeployment(
  url: string,
  safe: boolean,
  run: CommandRunner
): void {
  const args = ['remove', url, '--yes'];

  if (safe) {
    args.push('--safe');
  }

  run(args);
}

function formatTimestamp(deployment: VercelDeployment): string {
  const timestamp = deployment.ready ?? deployment.createdAt;

  if (!timestamp) {
    return 'unknown time';
  }

  return new Date(timestamp).toISOString();
}

export function selectDeletions(
  production: VercelDeployment[],
  preview: VercelDeployment[]
): { keep: VercelDeployment | undefined; deletions: Deletion[] } {
  const [keep, ...oldProductionDeployments] = production;

  return {
    keep,
    deletions: [
      ...oldProductionDeployments.map((deployment) => ({
        deployment,
        label: 'older READY production deployment',
      })),
      ...preview.map((deployment) => ({
        deployment,
        label: `preview deployment (${deployment.state ?? 'UNKNOWN'})`,
      })),
    ],
  };
}

export function main(args: string[], run: CommandRunner): void {
  const options = parseArgs(args);
  const productionDeployments = getDeployments(
    { environment: 'production', status: 'READY' },
    run
  );
  const previewDeployments = getDeployments({ environment: 'preview' }, run);

  if (productionDeployments.length === 0) {
    console.log('No READY production deployments found.');
  }

  const { keep: latestDeployment, deletions } = selectDeletions(
    productionDeployments,
    previewDeployments
  );

  if (latestDeployment) {
    console.log(
      `Keeping latest READY production deployment: ${latestDeployment.url}`
    );
    console.log(`Ready at: ${formatTimestamp(latestDeployment)}`);
  }

  if (deletions.length === 0) {
    console.log('Nothing to delete.');
    return;
  }

  console.log('');
  console.log(
    `${options.dryRun ? 'Would delete' : 'Deleting'} ${deletions.length} deployment(s):`
  );

  for (const { deployment, label } of deletions) {
    console.log(
      `- ${deployment.url} ${label} (${formatTimestamp(deployment)})`
    );

    if (!options.dryRun) {
      removeDeployment(deployment.url, options.safe, run);
    }
  }

  if (options.dryRun) {
    console.log('');
    console.log('Dry run complete. Re-run without --dry-run to delete them.');
  }
}

if (require.main === module) {
  try {
    main(process.argv.slice(2), runVercelCommand);
  } catch (error) {
    console.error(
      error instanceof Error
        ? `Cleanup failed: ${error.message}`
        : 'Cleanup failed.'
    );
    process.exit(1);
  }
}
