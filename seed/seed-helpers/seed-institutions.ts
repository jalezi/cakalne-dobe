import type { AllData } from '@/lib/zod-schemas/data-schemas';
import type { DataMap } from './types';
import { institutions as institutionsTable } from '@/db/schema/institution';
import { db } from '@/db';
import { trimmedStringSchema } from '@/lib/zod-schemas/helpers-schema';

export async function insertInstitutions(input: DataMap) {
  const institutions = getInstitutionsToInsert(Array.from(input.values()));
  for (const institution of Array.from(institutions.values())) {
    const result = await db
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
    const procedures = jobData.procedures;
    for (const procedure of procedures) {
      const waitingPeriods = procedure.waitingPeriods;
      for (const wpForAllInst of Object.values(waitingPeriods)) {
        if (!wpForAllInst) {
          continue;
        }
        for (const wpInst of wpForAllInst) {
          const trimmedFacility = trimmedStringSchema.parse(wpInst.facility);
          const hasInstitution = institutions.has(trimmedFacility);
          if (!hasInstitution) {
            institutions.set(trimmedFacility, {
              name: trimmedFacility,
            });
          }
        }
      }
    }
  }
  return institutions;
}
