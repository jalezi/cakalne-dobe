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

function getDeployments({
  environment,
  status,
}: GetDeploymentsOptions): VercelDeployment[] {
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

    const output = runVercelCommand(args);
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

function removeDeployment(url: string, safe: boolean): void {
  const args = ['remove', url, '--yes'];

  if (safe) {
    args.push('--safe');
  }

  runVercelCommand(args);
}

function formatTimestamp(deployment: VercelDeployment): string {
  const timestamp = deployment.ready ?? deployment.createdAt;

  if (!timestamp) {
    return 'unknown time';
  }

  return new Date(timestamp).toISOString();
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const productionDeployments = getDeployments({
    environment: 'production',
    status: 'READY',
  });
  const previewDeployments = getDeployments({ environment: 'preview' });

  if (productionDeployments.length === 0) {
    console.log('No READY production deployments found.');
  }

  const [latestDeployment, ...oldProductionDeployments] = productionDeployments;

  if (latestDeployment) {
    console.log(
      `Keeping latest READY production deployment: ${latestDeployment.url}`
    );
    console.log(`Ready at: ${formatTimestamp(latestDeployment)}`);
  }

  const deletions = [
    ...oldProductionDeployments.map((deployment) => ({
      deployment,
      label: 'older READY production deployment',
    })),
    ...previewDeployments.map((deployment) => ({
      deployment,
      label: `preview deployment (${deployment.state ?? 'UNKNOWN'})`,
    })),
  ];

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
      removeDeployment(deployment.url, options.safe);
    }
  }

  if (options.dryRun) {
    console.log('');
    console.log('Dry run complete. Re-run without --dry-run to delete them.');
  }
}

try {
  main();
} catch (error) {
  console.error(
    error instanceof Error
      ? `Cleanup failed: ${error.message}`
      : 'Cleanup failed.'
  );
  process.exit(1);
}
