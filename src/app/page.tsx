import { promises as fs } from 'fs';

import { ThemeToggler } from '@/components/theme-toggler';
import { allDataSchema } from '@/lib/zod-schemas/data-schemas';
import { DataTable } from './_components/data-table';
import { columns } from './_components/columns';
import { makeFacilityRows } from '@/lib/make-facility-row';
import { makeProcedureMaxAllowedWaiting } from '@/lib/make-procedure-max-allowed-waiting';

export default async function Home() {
  const file = await fs.readFile(
    process.cwd() + '/mock-data/cakalne-dobe.json',
    'utf8'
  );

  const data = JSON.parse(file);
  const parsedData = allDataSchema.safeParse(data);
  if (!parsedData.success) {
    console.error(parsedData.error.errors);
    throw new Error('Invalid data');
  }

  const allData = parsedData.data;
  const { start, procedures } = allData;
  const startDate = new Date(start);
  const formatedStartDate = Intl.DateTimeFormat('sl-SI', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).format(startDate);

  const rows = makeFacilityRows(procedures);

  const allowedMaxWaitingTimes = makeProcedureMaxAllowedWaiting(procedures);

  return (
    <>
      <header className="flex p-4">
        <h1>Čakalne dobe</h1>
        <ThemeToggler className="ml-auto" />
      </header>
      <main className="space-y-2 p-4">
        <p>
          Podatki pridobljeni: <time dateTime={start}>{formatedStartDate}</time>
        </p>
        <DataTable
          data={rows}
          columns={columns}
          meta={{ allowedMaxWaitingTimes }}
          initialState={{
            sorting: [{ id: 'code', desc: false }],
          }}
        />
      </main>
    </>
  );
}
