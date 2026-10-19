import { trimmedStringSchema } from '@/lib/zod-schemas/helpers-schema';

/**
 * Trims a procedure name and collapses each run of whitespace into one space.
 * Spaces around a dash are kept: `'A  -  B'` becomes `'A - B'`.
 *
 * @throws {ZodError} If the input is not a string.
 */
export function normalizeProcedureName(input: unknown): string {
  return trimmedStringSchema.parse(input);
}
