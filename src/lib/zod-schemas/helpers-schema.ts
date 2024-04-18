import { z } from 'zod';

export const trimmedStringSchema = z
  .string()
  .transform((s) => s.replace(/\s+/g, ' ').trim());

export const normalizeProcedureNameSchema = z.string().transform((s) =>
  s
    .split('-')
    .map((w) => trimmedStringSchema.parse(w))
    .join('-')
);
