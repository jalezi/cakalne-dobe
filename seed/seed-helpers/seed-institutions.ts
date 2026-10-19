import { db } from '@/db';
import { institutions as institutionsTable } from '@/db/schema/institution';
import { getSnapshotInstitutionNames } from '@/db/transforms';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import type { DataMap, SeedDbExecutor } from './types';

export async function insertInstitutions(
  input: DataMap,
  database: SeedDbExecutor = db
) {
  const institutions = getInstitutionsToInsert(Array.from(input.values()));
  for (const institution of Array.from(institutions.values())) {
    const result = await database
      .insert(institutionsTable)
      .values(institution)
      .onConflictDoNothing()
      .run();
    if (result.rowsAffected === 0) {
      console.warn(
        `Institution ${institution.name} already exists in the database.`
      );
    }
  }
}

export function getInstitutionsToInsert(
  jobs: AllData[]
): Map<string, { name: string }> {
  const institutions: Map<string, { name: string }> = new Map();
  for (const jobData of jobs) {
    for (const name of getSnapshotInstitutionNames(jobData)) {
      if (!institutions.has(name)) {
        institutions.set(name, { name });
      }
    }
  }
  return institutions;
}
