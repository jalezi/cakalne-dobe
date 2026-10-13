import { z } from 'zod';
import type { ReturnType } from './types';

export const VALIDATION_ERRORS = {
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  JOB_FAILED: 'JOB_FAILED',
} as const;

// TODO: Add a proper type for the webhook payload
const webhookPayloadSchema = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
  }),
  z.object({
    success: z.literal(false),
    error: z.string().default('Unknown Error'),
  }),
]);

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

/**
 * Validates the webhook payload.
 * @param payload The payload to validate
 * @returns Validation result
 */
export function validateWebhookPayload(
  payload: unknown
): ReturnType<Exclude<WebhookPayload, { success: 'error' }>> {
  const parsedPayload = webhookPayloadSchema.safeParse(payload);
  if (!parsedPayload.success) {
    return {
      success: false,
      error: {
        code: VALIDATION_ERRORS.INVALID_PAYLOAD,
        message: 'Invalid webhook payload',
      },
    };
  }

  if (!parsedPayload.data.success) {
    return {
      success: false,
      error: {
        code: VALIDATION_ERRORS.JOB_FAILED,
        message: parsedPayload.data.error,
      },
    };
  }

  return {
    success: true,
    data: parsedPayload.data,
  };
}
