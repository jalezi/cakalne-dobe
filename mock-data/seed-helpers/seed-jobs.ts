import { db } from '@/db';
import { jobs as jobsTable } from '@/db/schema/jobs';
import type { AllData } from '@/lib/zod-schemas/data-schemas';

import type { CustomError } from './types';
import { handleError } from './handle-error';

export async function insertJobs(jobs: [string, AllData][]) {
  const errors: CustomError[] = [];
  const existing: string[] = [];
  const unique: string[] = [];
  for (const [jobId, jobData] of jobs) {
    try {
      const result = await db
        .insert(jobsTable)
        .values({
          gitLabJobId: jobId,
          startDate: jobData.start,
          endDate: jobData.end,
        })
        .onConflictDoNothing()
        .run();
      if (result.rowsAffected === 0) {
        existing.push(jobId);
      } else {
        unique.push(jobId);
      }
    } catch (error) {
      const newError = handleError(error);
      errors.push({ error: newError, meta: { jobId } });
      continue;
    }
  }

  if (errors.length > 0) {
    return { errors, existing, unique };
  }
  return { errors: null, existing, unique };
}
