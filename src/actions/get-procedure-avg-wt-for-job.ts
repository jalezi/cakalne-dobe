'use server';

import { z } from 'zod';
import { db } from '@/db';
import {
  type ProcedureAvgWt,
  getProcedureAvgWtForJob as query,
} from '@/db/queries/waiting-periods';
import type { ActionResult } from './action-result';

const paramsSchema = z.object({
  jobId: z.string().trim().min(1),
});

export type GetProcedureAvgWtForJobResult = ActionResult<ProcedureAvgWt[]>;

export async function getProcedureAvgWtForJob(
  params: unknown
): Promise<GetProcedureAvgWtForJobResult> {
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return {
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Invalid input for getProcedureAvgWtForJob.',
        issues: parsedParams.error.issues,
      },
    };
  }

  try {
    const data = await query(db, parsedParams.data);

    return {
      success: true,
      data,
    };
  } catch {
    return {
      success: false,
      error: {
        code: 'QUERY_FAILED',
        message:
          'Failed to fetch waiting-period averages for the selected job.',
      },
    };
  }
}
