import { eq, inArray } from 'drizzle-orm';
import type { db } from '@/db';
import { procedures as proceduresTable } from '@/db/schema/procedures';

/**
 * Updates the stored name of each Snapshot procedure whose name differs from the stored one.
 * Run it before inserting the Snapshot's new codes. A rename is skipped with a warning when
 * its name belongs to another stored code, or to a new code of the Snapshot.
 *
 * @param database Database or transaction to write to
 * @param snapshotProcedures The Snapshot's procedures, with normalized names
 * @param storedNames Stored name by code, for the Snapshot's codes already stored
 * @returns The renamed codes
 */
export async function renameProcedures(
  database: Pick<typeof db, 'select' | 'update'>,
  snapshotProcedures: { code: string; name: string }[],
  storedNames: Map<string, string>
): Promise<string[]> {
  const renames = snapshotProcedures.flatMap(({ code, name }) => {
    const storedName = storedNames.get(code);
    return storedName !== undefined && storedName !== name
      ? [{ code, name, storedName }]
      : [];
  });
  if (renames.length === 0) return [];

  // Who holds each name, kept current as the renames run
  const holders = await database
    .select({ code: proceduresTable.code, name: proceduresTable.name })
    .from(proceduresTable)
    .where(
      inArray(
        proceduresTable.name,
        renames.map(({ name }) => name)
      )
    );
  const codeByName = new Map(holders.map(({ code, name }) => [name, code]));
  // A new code's name is taken: the code is inserted after the renames
  for (const { code, name } of snapshotProcedures) {
    if (!storedNames.has(code)) codeByName.set(name, code);
  }

  const renamed: string[] = [];
  for (const { code, name, storedName } of renames) {
    const holder = codeByName.get(name);
    if (holder !== undefined) {
      console.warn(
        `Procedure ${code} keeps the name "${storedName}": "${name}" belongs to ${holder}.`
      );
      continue;
    }

    await database
      .update(proceduresTable)
      .set({ name })
      .where(eq(proceduresTable.code, code));
    // Free the old name, unless a new code is about to take it
    if (codeByName.get(storedName) === code) codeByName.delete(storedName);
    codeByName.set(name, code);
    renamed.push(code);
  }
  return renamed;
}
