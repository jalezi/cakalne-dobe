'use server';

import { db } from '@/db';
import {
  type GetProcedureWtForInstOnDayParams,
  type InstitutionWaitingPeriod,
  getProcedureWtForInstOnDay as query,
} from '@/db/queries/waiting-periods';

export async function getProcedureWtForInstOnDay(
  params: GetProcedureWtForInstOnDayParams
): Promise<InstitutionWaitingPeriod[]> {
  return query(db, params);
}
