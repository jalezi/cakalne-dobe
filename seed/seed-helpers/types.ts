import type { InsertProcedure } from '@/db/schema/procedures';
import type { AllData } from '@/lib/zod-schemas/data-schemas';

export type DataMap = Map<string, AllData>;

export type ProcedureInsertData = Pick<InsertProcedure, 'code' | 'name'>;
export type CustomError = { error: Error; meta?: Record<string, unknown> };
