import type { AllData } from '@/lib/zod-schemas/data-schemas';
import { trimmedStringSchema } from '@/lib/zod-schemas/helpers-schema';

/**
 * Trims an institution name and collapses each run of whitespace into one space.
 *
 * @throws {ZodError} If the input is not a string.
 */
export function normalizeInstitutionName(input: unknown): string {
  return trimmedStringSchema.parse(input);
}

/** The key of `SnapshotInsertPayload['waitingPeriods']`: `<name>-<procedure code>`. */
export function snapshotInsertPayloadKey(
  facility: string,
  procedureCode: string
): string {
  return `${normalizeInstitutionName(facility)}-${procedureCode}`;
}

/**
 * Collects the normalized institution names of a Snapshot, in the order they first appear.
 *
 * @param snapshot - The Snapshot to read.
 * @returns The names, walking procedures, then urgencies, then facilities.
 */
export function getSnapshotInstitutionNames(snapshot: AllData): Set<string> {
  const names = new Set<string>();
  for (const procedure of snapshot.procedures) {
    for (const facilities of Object.values(procedure.waitingPeriods)) {
      if (!facilities) continue;

      for (const { facility } of facilities) {
        names.add(normalizeInstitutionName(facility));
      }
    }
  }
  return names;
}
