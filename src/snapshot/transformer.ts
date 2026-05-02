import { ZodError } from 'zod';
import { type AllData } from '@/lib/zod-schemas/data-schemas';
import { trimmedStringSchema } from '@/lib/zod-schemas/helpers-schema';
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
    const institutions: SnapshotInsertPayload['institutions'] = new Map();
    const maxAllowedDays: SnapshotInsertPayload['maxAllowedDays'] = [];
    const waitingPeriods: SnapshotInsertPayload['waitingPeriods'] = new Map();

    for (const procedure of input.procedures) {
      procedures.push({
        code: procedure.code,
        name: trimmedStringSchema.parse(procedure.name),
      });

      maxAllowedDays.push({
        ...procedure.maxAllowedDays,
        jobId,
        procedureCode: procedure.code,
      });

      for (const [urgency, facilityUrgencyDays] of Object.entries(
        procedure.waitingPeriods
      )) {
        if (!facilityUrgencyDays) continue;

        for (const { facility, days } of facilityUrgencyDays) {
          const trimmedFacility = trimmedStringSchema.parse(facility);

          if (!institutions.has(trimmedFacility)) {
            institutions.set(trimmedFacility, { name: trimmedFacility });
          }

          const key = `${trimmedFacility}-${procedure.code}`;
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
            institutionName: trimmedFacility,
          });
        }
      }
    }

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
