import { DataTable } from './data-table';
import { columns } from '@/app/_components/columns';
import { db } from '@/db';
import { institutions, maxAllowedDays, waitingPeriods } from '@/db/schema';
import { procedures as proceduresTable } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

interface TableProps {
  dbJobId: string;
  procedureCode: string;
}

export async function Table({ procedureCode, dbJobId }: TableProps) {
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
      eq(maxAllowedDays.procedureId, proceduresTable.id)
    );

  const procedures = await db.query.procedures.findMany({
    columns: {
      code: true,
      name: true,
    },
  });

  return (
    <DataTable
      data={rows}
      columns={columns}
      meta={{ allowedMaxWaitingTimes }}
      visibleProcedures={procedures}
      initialState={{
        sorting: [{ id: 'codeWithName', desc: false }],
        columnFilters: procedureName
          ? [
              {
                id: 'codeWithName',
                value: `${procedureCode} - ${procedureName}`,
              },
            ]
          : undefined,
        columnVisibility: procedureName
          ? {
              codeWithName: false,
            }
          : undefined,
      }}
    />
  );
}
