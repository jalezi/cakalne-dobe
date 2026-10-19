import { ZodError } from 'zod';
import {
  getSnapshotInstitutionNames,
  normalizeInstitutionName,
  normalizeProcedureName,
  snapshotInsertPayloadKey,
} from '@/db/transforms';
import { type AllData } from '@/lib/zod-schemas/data-schemas';
import type { Result, SnapshotInsertPayload } from '@/types';

export const SNAPSHOT_TRANSFORMER_ERRORS = {
  TRANSFORM_FAILED: 'TRANSFORM_FAILED',
} as const;

export type SnapshotTransformerMeta = { cause?: string };

export function prepareSnapshotInsertPayload(
  input: AllData,
  jobId: string
): Result<SnapshotInsertPayload, SnapshotTransformerMeta> {
  try {
    const procedures: SnapshotInsertPayload['procedures'] = [];
    const maxAllowedDays: SnapshotInsertPayload['maxAllowedDays'] = [];

    for (const procedure of input.procedures) {
      procedures.push({
        code: procedure.code,
        name: normalizeProcedureName(procedure.name),
      });

      maxAllowedDays.push({
        ...procedure.maxAllowedDays,
        jobId,
        procedureCode: procedure.code,
      });
    }

    const institutions: SnapshotInsertPayload['institutions'] = new Map(
      Array.from(getSnapshotInstitutionNames(input), (name) => [name, { name }])
    );
    const waitingPeriods = getWaitingPeriods(input, jobId);

    return {
      success: true,
      data: { procedures, institutions, maxAllowedDays, waitingPeriods },
    };
  } catch (error) {
    if (!(error instanceof ZodError)) {
      throw error;
    }

    return {
      success: false,
      error: {
        code: SNAPSHOT_TRANSFORMER_ERRORS.TRANSFORM_FAILED,
        message: `Failed to prepare snapshot insert payload for job ${jobId}`,
      },
      meta: { cause: error instanceof Error ? error.message : String(error) },
    };
  }
}

function getWaitingPeriods(
  input: AllData,
  jobId: string
): SnapshotInsertPayload['waitingPeriods'] {
  const waitingPeriods: SnapshotInsertPayload['waitingPeriods'] = new Map();

  for (const procedure of input.procedures) {
    for (const [urgency, facilityUrgencyDays] of Object.entries(
      procedure.waitingPeriods
    )) {
      if (!facilityUrgencyDays) continue;

      for (const { facility, days } of facilityUrgencyDays) {
        const key = snapshotInsertPayloadKey(facility, procedure.code);
        const existing = waitingPeriods.get(key);
        if (existing) {
          existing[urgency as 'regular' | 'fast' | 'veryFast'] = days;
          continue;
        }

        waitingPeriods.set(key, {
          regular: null,
          fast: null,
          veryFast: null,
          [urgency]: days,
          jobId,
          procedureCode: procedure.code,
          institutionName: normalizeInstitutionName(facility),
        });
      }
    }
  }

  return waitingPeriods;
}
