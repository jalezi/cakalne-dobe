import { and, avg, count, eq, sql, sum } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../schema';

type Db = ReturnType<typeof drizzle<typeof schema>>;

// ─── Param Types ────────────────────────────────────────────────────────────

export type GetProcedureAvgWtForJobParams = {
  jobId: string;
};

export type GetProcedureAvgWtPerJobChartParams = {
  procedureCode: string;
  fromDate: string;
  toDate: string;
};

export type GetProcedureWtForInstOnDayParams = {
  procedureCode: string;
  date: string;
};

// ─── Return Types ────────────────────────────────────────────────────────────

export type ProcedureAvgWt = {
  avg: { regular: number | null; fast: number | null; veryFast: number | null };
  total: {
    regular: number | null;
    fast: number | null;
    veryFast: number | null;
  };
  count: { regular: number; fast: number; veryFast: number };
  procedureCode: string;
  procedureName: string;
};

export type ChartDataPoint = {
  x: string;
  y: { regular: number; fast: number; veryFast: number };
};

export type InstitutionWaitingPeriod = {
  x: string;
  y: { regular: number | null; fast: number | null; veryFast: number | null };
};

// ─── Shared SQL Fragment ─────────────────────────────────────────────────────

const sqlJobStartDate = sql<string>`strftime('%Y-%m-%d',${schema.jobs.startDate})`;

// ─── Query Functions ─────────────────────────────────────────────────────────

export async function getProcedureAvgWtForJob(
  db: Db,
  { jobId }: GetProcedureAvgWtForJobParams
): Promise<ProcedureAvgWt[]> {
  return db
    .select({
      avg: {
        regular: avg(schema.waitingPeriods.regular).mapWith(Number),
        fast: avg(schema.waitingPeriods.fast).mapWith(Number),
        veryFast: avg(schema.waitingPeriods.veryFast).mapWith(Number),
      },
      total: {
        regular: sum(schema.waitingPeriods.regular).mapWith(Number),
        fast: sum(schema.waitingPeriods.fast).mapWith(Number),
        veryFast: sum(schema.waitingPeriods.veryFast).mapWith(Number),
      },
      count: {
        regular: count(schema.waitingPeriods.regular),
        fast: count(schema.waitingPeriods.fast),
        veryFast: count(schema.waitingPeriods.veryFast),
      },
      procedureCode: schema.procedures.code,
      procedureName: schema.procedures.name,
    })
    .from(schema.waitingPeriods)
    .where(eq(schema.waitingPeriods.jobId, jobId))
    .innerJoin(
      schema.procedures,
      eq(schema.waitingPeriods.procedureId, schema.procedures.id)
    )
    .innerJoin(
      schema.maxAllowedDays,
      and(
        eq(
          schema.waitingPeriods.procedureId,
          schema.maxAllowedDays.procedureId
        ),
        eq(schema.waitingPeriods.jobId, schema.maxAllowedDays.jobId)
      )
    )
    .groupBy(schema.waitingPeriods.procedureId);
}

export async function getProcedureAvgWtPerJobChart(
  db: Db,
  { procedureCode, fromDate, toDate }: GetProcedureAvgWtPerJobChartParams
): Promise<ChartDataPoint[]> {
  return db
    .select({
      x: sqlJobStartDate,
      y: {
        regular: avg(schema.waitingPeriods.regular).mapWith(Number),
        fast: avg(schema.waitingPeriods.fast).mapWith(Number),
        veryFast: avg(schema.waitingPeriods.veryFast).mapWith(Number),
      },
    })
    .from(schema.waitingPeriods)
    .where(
      and(
        eq(schema.procedures.code, procedureCode),
        sql`${sqlJobStartDate} >= ${fromDate}`,
        sql`${sqlJobStartDate} <= ${toDate}`
      )
    )
    .innerJoin(schema.jobs, eq(schema.waitingPeriods.jobId, schema.jobs.id))
    .innerJoin(
      schema.procedures,
      eq(schema.waitingPeriods.procedureId, schema.procedures.id)
    )
    .groupBy(schema.waitingPeriods.jobId, schema.waitingPeriods.procedureId)
    .orderBy(schema.jobs.startDate);
}

export async function getProcedureWtForInstOnDay(
  db: Db,
  { procedureCode, date }: GetProcedureWtForInstOnDayParams
): Promise<InstitutionWaitingPeriod[]> {
  return db
    .select({
      x: schema.institutions.name,
      y: {
        regular: schema.waitingPeriods.regular,
        fast: schema.waitingPeriods.fast,
        veryFast: schema.waitingPeriods.veryFast,
      },
    })
    .from(schema.waitingPeriods)
    .innerJoin(
      schema.procedures,
      eq(schema.waitingPeriods.procedureId, schema.procedures.id)
    )
    .innerJoin(schema.jobs, eq(schema.waitingPeriods.jobId, schema.jobs.id))
    .innerJoin(
      schema.institutions,
      eq(schema.waitingPeriods.institutionId, schema.institutions.id)
    )
    .where(
      and(eq(schema.procedures.code, procedureCode), eq(sqlJobStartDate, date))
    )
    .orderBy(schema.waitingPeriods.regular)
    .groupBy(schema.institutions.name);
}
