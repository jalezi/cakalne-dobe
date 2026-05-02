import type * as schema from '@/db/schema';
import { type AllData, allDataSchema } from '@/lib/zod-schemas/data-schemas';
import { trimmedStringSchema } from '@/lib/zod-schemas/helpers-schema';
import type { ActionReturnType, NotCompleteDataByTable } from '@/types';

const BASE_JOBS_URL =
  'https://wayback-automachine.gitlab.io/-/cakalne-dobe/-/jobs';

export const snapshotUrl = (gitLabJobId: string) =>
  `${BASE_JOBS_URL}/${gitLabJobId}/artifacts/out.json`;

export async function fetchSnapshot(
  gitLabJobId: string
): Promise<ActionReturnType<AllData>> {
  const res = await fetch(snapshotUrl(gitLabJobId));
  if (!res.ok) {
    return {
      success: false,
      error: `Failed to fetch snapshot for job ${gitLabJobId}: ${res.status} ${res.statusText}`,
    };
  }
  const raw = await res.json();
  const parsed = allDataSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid snapshot data for job ${gitLabJobId}`,
      details: { issues: parsed.error.issues },
    };
  }
  return { success: true, data: parsed.data };
}

export type PreparedSnapshot = {
  jobData: schema.InsertJob;
  notCompleteDataObj: NotCompleteDataByTable;
};

export async function fetchAndPrepareSnapshot(
  gitLabJobId: string
): Promise<ActionReturnType<PreparedSnapshot>> {
  const fetchResult = await fetchSnapshot(gitLabJobId);
  if (!fetchResult.success) {
    return fetchResult;
  }

  const data = fetchResult.data;
  const jobData: schema.InsertJob = {
    gitLabJobId,
    startDate: data.start,
    endDate: data.end,
  };

  return {
    success: true,
    data: {
      jobData,
      notCompleteDataObj: prepareNotCompleteDataByTable(data, gitLabJobId),
    },
  };
}

export function prepareNotCompleteDataByTable(
  input: AllData,
  jobId: string
): NotCompleteDataByTable {
  const procedures: NotCompleteDataByTable['procedures'] = [];
  const institutions: NotCompleteDataByTable['institutions'] = new Map();
  const maxAllowedDays: NotCompleteDataByTable['maxAllowedDays'] = [];
  const waitingPeriods: NotCompleteDataByTable['waitingPeriods'] = new Map();

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

  return { procedures, institutions, maxAllowedDays, waitingPeriods };
}
