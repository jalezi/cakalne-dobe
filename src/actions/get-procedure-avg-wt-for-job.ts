'use server';

import { db } from '@/db';
import {
  type GetProcedureAvgWtForJobParams,
  type ProcedureAvgWt,
  getProcedureAvgWtForJob as query,
} from '@/db/queries/waiting-periods';

export async function getProcedureAvgWtForJob(
  params: GetProcedureAvgWtForJobParams
): Promise<ProcedureAvgWt[]> {
  return query(db, params);
}
