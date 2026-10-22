import { QueryClient } from '@tanstack/react-query';
import { isApiError } from '../domain/errors';

/** Retries only transient failures; a 4xx from the server will not get better by repeating it. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: (count, err) => !isApiError(err) && count < 2, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}
