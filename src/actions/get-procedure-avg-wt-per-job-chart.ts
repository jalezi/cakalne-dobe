'use server';

import { z } from 'zod';
import { db } from '@/db';
import {
  type ChartDataPoint,
  getProcedureAvgWtPerJobChart as query,
} from '@/db/queries/waiting-periods';
import type { ActionResult } from './action-result';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const dateStringSchema = z
  .string()
  .regex(dateRegex, 'Expected date format: YYYY-MM-DD')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), {
    message: 'Invalid date value.',
  });

const paramsSchema = z
  .object({
    procedureCode: z.string().trim().min(1),
    fromDate: dateStringSchema.optional(),
    toDate: dateStringSchema.optional(),
  })
  .transform((value) => {
    const today = formatDate(new Date());
    const toDate = value.toDate ?? today;
    const fromDate =
      value.fromDate ?? formatDate(addDays(parseDate(toDate), -30));

    return {
      procedureCode: value.procedureCode,
      fromDate,
      toDate,
    };
  })
  .refine((value) => value.fromDate <= value.toDate, {
    message: 'fromDate must be less than or equal to toDate.',
    path: ['fromDate'],
  });

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export type GetProcedureAvgWtPerJobChartResult = ActionResult<ChartDataPoint[]>;

export async function getProcedureAvgWtPerJobChart(
  params: unknown
): Promise<GetProcedureAvgWtPerJobChartResult> {
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return {
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Invalid input for getProcedureAvgWtPerJobChart.',
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
        message: 'Failed to fetch chart data for the selected procedure.',
      },
    };
  }
}
