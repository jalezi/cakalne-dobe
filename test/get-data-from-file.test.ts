import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import { getDataFromFiles } from '../seed/seed-helpers/get-data-from-file';

const VALID_DATA: AllData = {
  start: '2026-04-01T00:00:00Z',
  end: '2026-04-01T01:00:00Z',
  procedures: [
    {
      code: 'PROC-1',
      name: 'Procedure 1',
      maxAllowedDays: { regular: 30, fast: 10, veryFast: 5 },
      waitingPeriods: {
        regular: [{ facility: 'Facility 1', days: 20 }],
        fast: null,
        veryFast: null,
      },
    },
  ],
};

describe('getDataFromFiles', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'get-data-from-file-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('reads a valid file keyed by the job ID in its name', async () => {
    const fileName = 'wp-2026-04-01-00-00-00-1001.json';
    await writeFile(join(dir, fileName), JSON.stringify(VALID_DATA));

    const result = await getDataFromFiles([fileName], dir);

    expect(result.errors).toBeNull();
    expect(Array.from(result.data.entries())).toEqual([['1001', VALID_DATA]]);
  });

  it.each([
    {
      case: 'invalid JSON',
      fileName: 'wp-2026-04-01-00-00-00-1001.json',
      content: '{"broken":',
      error: expect.any(SyntaxError),
    },
    {
      case: 'data that fails allDataSchema',
      fileName: 'wp-2026-04-01-00-00-00-1001.json',
      content: JSON.stringify({ start: '2026-04-01T00:00:00Z' }),
      error: expect.any(ZodError),
    },
    {
      case: 'a file name with no job ID',
      fileName: 'wp-.json',
      content: JSON.stringify(VALID_DATA),
      error: new Error('Job ID not found in file name'),
    },
  ])('records an error with the file name for $case', async ({
    fileName,
    content,
    error,
  }) => {
    await writeFile(join(dir, fileName), content);

    const result = await getDataFromFiles([fileName], dir);

    expect(result.data.size).toBe(0);
    expect(result.errors).toEqual([{ error, meta: { fileName } }]);
  });
});
