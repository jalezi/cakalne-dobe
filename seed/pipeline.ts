import type { AllData } from '@/lib/zod-schemas/data-schemas';
import { insertInstitutions } from './seed-helpers/seed-institutions';
import { insertJobs } from './seed-helpers/seed-jobs';
import { insertMaxAllowedDays } from './seed-helpers/seed-max-allowed-days';
import { insertProcedures } from './seed-helpers/seed-procedures';
import { insertWaitingTimes } from './seed-helpers/seed-waiting-times';
import type {
  DataMap,
  ProcedureInsertData,
  SeedDbExecutor,
} from './seed-helpers/types';

/**
 * Typed builder that enforces FK-safe insertion order:
 *   jobs → procedures → maxAllowedDays → institutions → waitingPeriods
 *
 * TypeScript prevents calling `execute` before all three steps are configured.
 */
export function createIngestionPipeline(jobs: [string, AllData][]) {
  return {
    withProcedures(procedures: ProcedureInsertData[]) {
      return {
        withDataMap(dataMap: DataMap) {
          return {
            async execute(tx: SeedDbExecutor): Promise<void> {
              const { errors: jobErrors } = await insertJobs(jobs, tx);
              if (jobErrors?.length) throw jobErrors[0].error;

              const { errors: procErrors } = await insertProcedures(
                procedures,
                tx
              );
              if (procErrors?.length) throw procErrors[0].error;

              await insertMaxAllowedDays(dataMap, tx);
              await insertInstitutions(dataMap, tx);
              await insertWaitingTimes(dataMap, tx);
            },
          };
        },
      };
    },
  };
}
