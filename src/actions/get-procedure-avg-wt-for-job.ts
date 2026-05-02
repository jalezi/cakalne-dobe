'use server';

import { z } from 'zod';
import { db } from '@/db';
import {
  type ProcedureAvgWt,
  getProcedureAvgWtForJob as query,
} from '@/db/queries/waiting-periods';
import type { ActionResult } from './action-result';
import { createAction } from './create-action';

const paramsSchema = z.object({
  jobId: z.string().trim().min(1),
});

export type GetProcedureAvgWtForJobResult = ActionResult<ProcedureAvgWt[]>;

export const getProcedureAvgWtForJob = createAction(
  paramsSchema,
  (params) => query(db, params),
  {
    messages: {
      invalidInput: 'Invalid input for getProcedureAvgWtForJob.',
      queryFailed:
        'Failed to fetch waiting-period averages for the selected job.',
    },
  }
);
