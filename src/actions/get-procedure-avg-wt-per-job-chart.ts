'use server';

import { z } from 'zod';
import { db } from '@/db';
import { getProcedureAvgWtPerJobChart as query } from '@/db/queries/waiting-periods';
import { addDays, formatDate, parseDate } from '@/lib/date-utils';
import { createAction } from './create-action';

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

export const getProcedureAvgWtPerJobChartAction = createAction(
  paramsSchema,
  (params) => query(db, params),
  {
    messages: {
      invalidInput: 'Invalid input for getProcedureAvgWtPerJobChart.',
      queryFailed: 'Failed to fetch chart data for the selected procedure.',
    },
  }
);
