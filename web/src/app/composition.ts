import type { TokenStorage } from '../application/ports/TokenStorage';
import type { Services } from '../application/ServicesContext';
import { AuthApi } from '../data/api/AuthApi';
import { DeckApi } from '../data/api/DeckApi';
import { FlashcardApi } from '../data/api/FlashcardApi';
import { ReviewApi } from '../data/api/ReviewApi';
import { SessionApi } from '../data/api/SessionApi';
import { FetchHttpClient } from '../data/http/FetchHttpClient';
import { UnauthorizedSignal } from '../data/http/UnauthorizedSignal';
import { WebTokenStorage } from '../data/storage/WebTokenStorage';

export interface CompositionOptions {
  baseUrl: string;
  /** Test seam; defaults to localStorage-backed storage. */
  tokens?: TokenStorage;
  fetchImpl?: typeof fetch;
}

/** The only place concrete data classes are constructed and wired to the application ports. */
export function composeServices({ baseUrl, tokens = new WebTokenStorage(), fetchImpl }: CompositionOptions): Services {
  const signal = new UnauthorizedSignal();
  const http = new FetchHttpClient({ baseUrl, tokens, onUnauthorized: signal.notify, fetchImpl });
  return {
    auth: new AuthApi(http),
    session: new SessionApi(http),
    deck: new DeckApi(http),
    review: new ReviewApi(http),
    flashcards: new FlashcardApi(http),
    tokens,
    sessionExpired: signal,
  };
}
