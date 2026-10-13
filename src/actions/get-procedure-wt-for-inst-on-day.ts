'use server';

import { z } from 'zod';
import { db } from '@/db';
import { getProcedureWtForInstOnDay as query } from '@/db/queries/waiting-periods';
import { createAction } from './create-action';

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

export const getProcedureWtForInstOnDayAction = createAction(
  paramsSchema,
  (params) => query(db, params),
  {
    messages: {
      invalidInput: 'Invalid input for getProcedureWtForInstOnDayAction.',
      queryFailed:
        'Failed to fetch institution waiting periods for the selected date.',
    },
  }
);
