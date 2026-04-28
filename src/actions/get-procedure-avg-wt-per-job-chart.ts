'use server';

import { db } from '@/db';
import {
  type ChartDataPoint,
  type GetProcedureAvgWtPerJobChartParams,
  getProcedureAvgWtPerJobChart as query,
} from '@/db/queries/waiting-periods';

export async function getProcedureAvgWtPerJobChart(
  params: GetProcedureAvgWtPerJobChartParams
): Promise<ChartDataPoint[]> {
  return query(db, params);
}
