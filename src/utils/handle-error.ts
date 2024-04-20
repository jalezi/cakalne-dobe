export function handleError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (error?.toString) {
    return new Error(error.toString());
  }
  return new Error('Unknown error');
}
