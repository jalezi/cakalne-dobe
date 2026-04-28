'use server';

import { z } from 'zod';
import { db } from '@/db';
import {
  type InstitutionWaitingPeriod,
  getProcedureWtForInstOnDay as query,
} from '@/db/queries/waiting-periods';
import type { ActionResult } from './action-result';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const paramsSchema = z.object({
  procedureCode: z.string().trim().min(1),
  date: z
    .string()
    .regex(dateRegex, 'Expected date format: YYYY-MM-DD')
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), {
      message: 'Invalid date value.',
    }),
});

export type GetProcedureWtForInstOnDayResult = ActionResult<
  InstitutionWaitingPeriod[]
>;

export async function getProcedureWtForInstOnDay(
  params: unknown
): Promise<GetProcedureWtForInstOnDayResult> {
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return {
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Invalid input for getProcedureWtForInstOnDay.',
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
          'Failed to fetch institution waiting periods for the selected date.',
      },
    };
  }
}
