import type { TokenStorage } from '../../application/ports/TokenStorage';
import { ApiError, NetworkError } from '../../domain/errors';
import type { HttpClient } from './HttpClient';

export interface FetchHttpClientOptions {
  baseUrl: string;
  tokens: Pick<TokenStorage, 'get'>;
  /** Called when a request that carried a token is rejected with 401. */
  onUnauthorized: () => void;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

const DEFAULT_TIMEOUT_MS = 15_000;

export class FetchHttpClient implements HttpClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: FetchHttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? ((...args) => fetch(...args));
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body ?? {});
  }

  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const token = await this.options.tokens.get().catch(() => null);
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    let text: string;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
        // Per-user data: never reuse a cached response (the server also sends Cache-Control: no-store).
        cache: 'no-store',
      });
      text = await response.text();
    } catch (err) {
      throw controller.signal.aborted ? new NetworkError('The server took too long to respond. Please try again.') : new NetworkError();
    } finally {
      clearTimeout(timer);
    }

    const json = parseJson(text);
    if (!response.ok) {
      // A rejected token (not a failed login) means the session is over.
      if (response.status === 401 && token) this.options.onUnauthorized();
      throw toApiError(response.status, json);
    }
    if (text === '') return undefined as T;
    if (json === undefined) throw new ApiError(response.status, 'BAD_RESPONSE', 'The server sent an unreadable response.');
    return json as T;
  }
}

function parseJson(text: string): unknown {
  if (text === '') return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function toApiError(status: number, json: unknown): ApiError {
  const envelope = (json as { error?: { code?: unknown; message?: unknown } } | undefined)?.error;
  if (typeof envelope?.code === 'string' && typeof envelope.message === 'string') {
    return new ApiError(status, envelope.code, envelope.message);
  }
  return new ApiError(status, 'HTTP_ERROR', `Request failed (${status}).`);
}
