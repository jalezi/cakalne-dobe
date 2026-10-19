// test/global-setup.ts
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    testDbDir: string;
  }
}

// getTestDb writes its database files here. A unique folder per run, so one
// run's teardown can't delete the databases of another run on the same machine.
export default async function setup(project: TestProject) {
  const dir = await mkdtemp(join(tmpdir(), 'cakalne-dobe-test-db-'));
  project.provide('testDbDir', dir);
  return () => rm(dir, { recursive: true, force: true });
}
