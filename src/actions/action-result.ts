import type { ZodError } from 'zod';
import type { Result } from '@/types';

export const ACTION_ERRORS = {
  INVALID_INPUT: 'INVALID_INPUT',
  QUERY_FAILED: 'QUERY_FAILED',
} as const;

export type ActionInputMeta = { issues: ZodError['issues'] };

export type ActionResult<TData> = Result<TData, ActionInputMeta>;
