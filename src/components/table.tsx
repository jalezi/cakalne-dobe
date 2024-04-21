import { DataTable } from './data-table';
import { columns } from '@/app/_components/columns';
import { db } from '@/db';
import { institutions, maxAllowedDays, waitingPeriods } from '@/db/schema';
import { procedures as proceduresTable } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { ProceduresPicker } from './procedures-picker';

interface TableProps {
  dbJobId: string;
  procedureCode: string;
  urlSearchParams: URLSearchParams;
}

export async function Table({
  procedureCode,
  dbJobId,
  urlSearchParams,
}: TableProps) {
  const procedureNameObj = await db.query.procedures.findFirst({
    columns: {
      name: true,
    },
    where: (procedures, operators) =>
      operators.eq(procedures.code, procedureCode),
  });

  const procedureName = procedureNameObj?.name; // fixme -  need a fallback

  const rows = await db
    .select({
      facility: institutions.name,
      procedure: {
        code: proceduresTable.code,
        name: proceduresTable.name,
      },
      waitingPeriods: {
        regular: waitingPeriods.regular,
        fast: waitingPeriods.fast,
        veryFast: waitingPeriods.veryFast,
      },
    })
    .from(waitingPeriods)
    .where(
      and(
        eq(waitingPeriods.jobId, dbJobId),
        eq(proceduresTable.code, procedureCode)
      )
    )
    .innerJoin(
      proceduresTable,
      eq(waitingPeriods.procedureId, proceduresTable.id)
    )
    .innerJoin(institutions, eq(waitingPeriods.institutionId, institutions.id));

  const allowedMaxWaitingTimes = await db
    .select({
      code: proceduresTable.code,
      name: proceduresTable.name,
      maxAllowedDays: {
        regular: maxAllowedDays.regular,
        fast: maxAllowedDays.fast,
        veryFast: maxAllowedDays.veryFast,
      },
    })
    .from(maxAllowedDays)
    .where(eq(maxAllowedDays.jobId, dbJobId))
    .innerJoin(
      proceduresTable,
      and(
        eq(maxAllowedDays.procedureId, proceduresTable.id),
        eq(proceduresTable.code, procedureCode)
      )
    );

  const procedures = await db.query.procedures.findMany({
    columns: {
      code: true,
      name: true,
    },
  });

  return (
    <>
      <ProceduresPicker
        currentProcedureCode={procedureCode}
        procedures={procedures}
        pathname={`/${dbJobId}`}
        urlSearchParams={urlSearchParams}
      />
      <DataTable
        data={rows}
        columns={columns}
        meta={{ allowedMaxWaitingTimes, procedureCode }}
        initialState={{
          sorting: [{ id: 'codeWithName', desc: false }],
          columnVisibility: procedureName
            ? {
                codeWithName: false,
              }
            : undefined,
        }}
      />
    </>
  );
}
