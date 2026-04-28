import type { ZodError } from 'zod';

export type ActionError =
  | {
      code: 'INVALID_INPUT';
      message: string;
      issues: ZodError['issues'];
    }
  | {
      code: 'QUERY_FAILED';
      message: string;
    };

export type ActionResult<TData> =
  | {
      success: true;
      data: TData;
    }
  | {
      success: false;
      error: ActionError;
    };
