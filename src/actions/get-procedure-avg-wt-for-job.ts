'use server';

import { z } from 'zod';
import { db } from '@/db';
import { getProcedureAvgWtForJob as query } from '@/db/queries/waiting-periods';
import { createAction } from './create-action';

const paramsSchema = z.object({
  jobId: z.string().trim().min(1),
});

export const getProcedureAvgWtForJobAction = createAction(
  paramsSchema,
  (params) => query(db, params),
  {
    messages: {
      invalidInput: 'Invalid input for getProcedureAvgWtForJobAction.',
      queryFailed:
        'Failed to fetch waiting-period averages for the selected job.',
    },
  }
);
