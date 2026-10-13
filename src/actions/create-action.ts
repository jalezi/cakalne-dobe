import type { z } from 'zod';
import { ACTION_ERRORS, type ActionResult } from './action-result';

interface CreateActionOptions {
  messages?: {
    invalidInput?: string;
    queryFailed?: string;
  };
}

export function createAction<TSchema extends z.ZodTypeAny, TData>(
  schema: TSchema,
  queryFn: (params: z.output<TSchema>) => Promise<TData>,
  options?: CreateActionOptions
): (params: unknown) => Promise<ActionResult<TData>> {
  return async (params: unknown): Promise<ActionResult<TData>> => {
    const parsed = schema.safeParse(params);

    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: ACTION_ERRORS.INVALID_INPUT,
          message: options?.messages?.invalidInput ?? 'Invalid input.',
        },
        meta: { issues: parsed.error.issues },
      };
    }

    try {
      const data = await queryFn(parsed.data);
      return { success: true, data };
    } catch {
      return {
        success: false,
        error: {
          code: ACTION_ERRORS.QUERY_FAILED,
          message: options?.messages?.queryFailed ?? 'Query failed.',
        },
      };
    }
  };
}
