import type { AllData } from '@/lib/zod-schemas/data-schemas';

export type DataMap = Map<string, AllData>;
export type CustomError = { error: Error; meta?: Record<string, unknown> };
