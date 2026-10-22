import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { AuthApi } from '../../src/data/api/AuthApi';
import { DeckApi } from '../../src/data/api/DeckApi';
import { FlashcardApi } from '../../src/data/api/FlashcardApi';
import { ReviewApi } from '../../src/data/api/ReviewApi';
import { SessionApi } from '../../src/data/api/SessionApi';
import type { HttpClient } from '../../src/data/http/HttpClient';
import { FetchHttpClient } from '../../src/data/http/FetchHttpClient';
import { UnauthorizedSignal } from '../../src/data/http/UnauthorizedSignal';
import { InMemoryTokenStorage } from '../../src/data/storage/InMemoryTokenStorage';
import { WebTokenStorage } from '../../src/data/storage/WebTokenStorage';
import { composeServices } from '../../src/app/composition';
import { ApiError, NetworkError } from '../../src/domain/errors';

const reply = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) }) as Response;

function setup(token: string | null = 'tok', fetchImpl?: Mock) {
  const fetchMock = fetchImpl ?? vi.fn(async () => reply(200, { ok: true }));
  const onUnauthorized = vi.fn();
  const http = new FetchHttpClient({
    baseUrl: 'https://api.test/', tokens: new InMemoryTokenStorage(token), onUnauthorized, fetchImpl: fetchMock as unknown as typeof fetch,
  });
  return { http, fetchMock, onUnauthorized };
}

describe('FetchHttpClient', () => {
  it('builds the URL, sends the bearer token and JSON body', async () => {
    const { http, fetchMock } = setup('abc');
    await http.post('/api/review', { a: 1 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/api/review');
    expect(init).toMatchObject({ method: 'POST', body: '{"a":1}' });
    expect(init.headers).toMatchObject({ Authorization: 'Bearer abc', 'Content-Type': 'application/json', Accept: 'application/json' });
  });

  it('asks the browser never to reuse a cached response', async () => {
    const { http, fetchMock } = setup('abc');
    await http.get('/api/session/today');
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ cache: 'no-store' });
  });

  it('omits the Authorization header when signed out, and sends no body on GET', async () => {
    const { http, fetchMock } = setup(null);
    await http.get('/api/session/today');
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(init.body).toBeUndefined();
    expect(init.method).toBe('GET');
  });

  it('returns parsed JSON', async () => {
    const { http } = setup('t', vi.fn(async () => reply(200, { hello: 'world' })));
    await expect(http.get('/x')).resolves.toEqual({ hello: 'world' });
  });

  it("maps the backend's error envelope to ApiError", async () => {
    const { http } = setup('t', vi.fn(async () => reply(409, { error: { code: 'CONFLICT', message: 'Email already registered' } })));
    await expect(http.post('/x')).rejects.toMatchObject({ name: 'ApiError', status: 409, code: 'CONFLICT', message: 'Email already registered' });
  });

  it('falls back to a generic ApiError for non-envelope failures', async () => {
    const { http } = setup('t', vi.fn(async () => reply(502, '<html>bad gateway</html>')));
    await expect(http.get('/x')).rejects.toMatchObject({ status: 502, code: 'HTTP_ERROR', message: 'Request failed (502).' });
  });

  it('rejects an unreadable success response', async () => {
    const { http } = setup('t', vi.fn(async () => reply(200, 'not json')));
    await expect(http.get('/x')).rejects.toMatchObject({ code: 'BAD_RESPONSE' });
  });

  it('maps network failures to NetworkError', async () => {
    const { http } = setup('t', vi.fn(async () => { throw new TypeError('Network request failed'); }));
    await expect(http.get('/x')).rejects.toBeInstanceOf(NetworkError);
  });

  it('times out slow requests', async () => {
    const slow = vi.fn((_url: string, init: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')))));
    const http = new FetchHttpClient({
      baseUrl: 'https://api.test', tokens: new InMemoryTokenStorage('t'), onUnauthorized: vi.fn(), timeoutMs: 20, fetchImpl: slow as unknown as typeof fetch,
    });
    await expect(http.get('/x')).rejects.toThrow(/too long/);
  });

  it('signals an expired session on 401 only when a token was sent', async () => {
    const unauthorized = () => vi.fn(async () => reply(401, { error: { code: 'UNAUTHORIZED', message: 'nope' } }));
    const withToken = setup('t', unauthorized());
    await expect(withToken.http.get('/x')).rejects.toBeInstanceOf(ApiError);
    expect(withToken.onUnauthorized).toHaveBeenCalledTimes(1);

    const loginAttempt = setup(null, unauthorized());
    await expect(loginAttempt.http.post('/api/auth/login', {})).rejects.toBeInstanceOf(ApiError);
    expect(loginAttempt.onUnauthorized).not.toHaveBeenCalled();
  });

  it('does not signal for other errors', async () => {
    const { http, onUnauthorized } = setup('t', vi.fn(async () => reply(404, { error: { code: 'NOT_FOUND', message: 'x' } })));
    await expect(http.get('/x')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('survives a token storage failure by sending no token', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: { headers: Record<string, string> }) => reply(200, {}));
    const http = new FetchHttpClient({
      baseUrl: 'https://api.test', tokens: { get: async () => { throw new Error('keychain'); } }, onUnauthorized: vi.fn(),
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await http.get('/x');
    expect(fetchMock.mock.calls[0]![1].headers.Authorization).toBeUndefined();
  });
});

describe('API classes hit the right endpoints', () => {
  const mocks = { get: vi.fn(async () => ({})), post: vi.fn(async () => ({})) };
  const http = mocks as unknown as HttpClient;
  beforeEach(() => vi.clearAllMocks());

  it('AuthApi', async () => {
    const api = new AuthApi(http);
    await api.register('a@b.co', 'pw', 'Europe/Paris');
    expect(mocks.post).toHaveBeenCalledWith('/api/auth/register', { email: 'a@b.co', password: 'pw', timeZone: 'Europe/Paris' });
    await api.login('a@b.co', 'pw');
    expect(mocks.post).toHaveBeenCalledWith('/api/auth/login', { email: 'a@b.co', password: 'pw' });
  });
  it('SessionApi', async () => {
    const api = new SessionApi(http);
    await api.today();
    expect(mocks.get).toHaveBeenCalledWith('/api/session/today');
    await api.start(true);
    expect(mocks.post).toHaveBeenCalledWith('/api/session/start', { skipNewCards: true });
  });
  it('DeckApi', async () => {
    await new DeckApi(http).current();
    expect(mocks.get).toHaveBeenCalledWith('/api/decks/daily');
  });
  it('ReviewApi', async () => {
    const api = new ReviewApi(http);
    await api.reveal({ flashcardId: 1, spellingInput: 'x' });
    expect(mocks.post).toHaveBeenCalledWith('/api/review/reveal', { flashcardId: 1, spellingInput: 'x' });
    await api.submit({ flashcardId: 1, spellingInput: 'x', pronunciationCorrect: true });
    expect(mocks.post).toHaveBeenCalledWith('/api/review', { flashcardId: 1, spellingInput: 'x', pronunciationCorrect: true });
  });
  it('FlashcardApi', async () => {
    const card = { frenchText: 'a', englishTranslation: 'b', photoUrl: 'https://x.co', description: 'd', phoneticSpelling: null };
    await new FlashcardApi(http).add(card);
    expect(mocks.post).toHaveBeenCalledWith('/api/flashcards', card);
  });
});

describe('UnauthorizedSignal', () => {
  it('notifies subscribers until they unsubscribe', () => {
    const signal = new UnauthorizedSignal();
    const a = vi.fn();
    const off = signal.subscribe(a);
    signal.notify();
    off();
    signal.notify();
    expect(a).toHaveBeenCalledTimes(1);
  });
});

describe('composeServices', () => {
  it('wires a working stack: 401 on an authenticated call fires sessionExpired', async () => {
    const fetchImpl = vi.fn(async () => reply(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } }));
    const services = composeServices({ baseUrl: 'https://api.test', tokens: new InMemoryTokenStorage('t'), fetchImpl: fetchImpl as unknown as typeof fetch });
    const listener = vi.fn();
    services.sessionExpired.subscribe(listener);
    await expect(services.deck.current()).rejects.toBeInstanceOf(ApiError);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('relative base URL (PWA served by the backend)', () => {
  it('builds same-origin request URLs', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: unknown) => reply(200, { ok: true }));
    const http = new FetchHttpClient({ baseUrl: '', tokens: new InMemoryTokenStorage(), onUnauthorized: vi.fn(), fetchImpl: fetchMock as unknown as typeof fetch });
    await http.get('/api/session/today');
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/session/today');
  });
});

describe('WebTokenStorage', () => {
  const fakeStorage = () => {
    const data = new Map<string, string>();
    return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k), data };
  };

  it('round-trips and clears the token', async () => {
    const backing = fakeStorage();
    const store = new WebTokenStorage(backing);
    expect(await store.get()).toBeNull();
    await store.set('abc');
    expect(await store.get()).toBe('abc');
    expect(await new WebTokenStorage(backing).get()).toBe('abc'); // persists across instances (page reloads)
    await store.clear();
    expect(await new WebTokenStorage(backing).get()).toBeNull();
  });

  it('falls back to memory when storage throws (private mode)', async () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
    const store = new WebTokenStorage(broken);
    await store.set('abc');
    expect(await store.get()).toBe('abc');
    await store.clear();
    expect(await store.get()).toBeNull();
  });

  it('works with no storage at all', async () => {
    const store = new WebTokenStorage(null);
    await store.set('abc');
    expect(await store.get()).toBe('abc');
  });
});
