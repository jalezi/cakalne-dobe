import { z } from 'zod';

export const trimmedStringSchema = z
  .string()
  .transform((s) => s.replace(/\s+/g, ' ').trim());
