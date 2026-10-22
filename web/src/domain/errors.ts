/** An error response from the backend ({ error: { code, message } }). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** The request never got a response (offline, DNS, timeout). */
export class NetworkError extends Error {
  constructor(message = 'Could not reach the server. Check your connection and try again.') {
    super(message);
    this.name = 'NetworkError';
  }
}

export const isApiError = (err: unknown): err is ApiError => err instanceof ApiError;
export const isNetworkError = (err: unknown): err is NetworkError => err instanceof NetworkError;
export const isUnauthorized = (err: unknown): boolean => isApiError(err) && err.status === 401;

/** A user-facing message for any error. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError || err instanceof NetworkError) return err.message;
  return 'Something went wrong. Please try again.';
}
