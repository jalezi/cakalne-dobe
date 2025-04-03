import { z } from 'zod';
import type { ReturnType } from './types';

const webhookPayloadSchema = z.discriminatedUnion('success', [
  z.object({
    success: z.literal('ok'),
  }),
  z.object({
    success: z.literal('error'),
    error: z.string(),
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
      error: 'Invalid webhook payload',
      details: {
        message: parsedPayload.error.message,
        payload,
        errors: parsedPayload.error.flatten(),
      },
    };
  }

  if (parsedPayload.data.success === 'error') {
    return {
      success: false,
      error: parsedPayload.data.error,
      details: {
        message: 'GitLab job failed',
        payload,
        errors: parsedPayload.data.error,
      },
    };
  }

  return {
    success: true,
    data: parsedPayload.data,
  };
}
