import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { vi, type Mock } from 'vitest';
import { AuthProvider } from '../../src/application/auth/AuthProvider';
import type { DeckGateway } from '../../src/application/ports/DeckGateway';
import type { ReviewGateway } from '../../src/application/ports/ReviewGateway';
import type { SessionGateway } from '../../src/application/ports/SessionGateway';
import { ServicesProvider, type Services } from '../../src/application/ServicesContext';
import { InMemoryTokenStorage } from '../../src/data/storage/InMemoryTokenStorage';
import { UnauthorizedSignal } from '../../src/data/http/UnauthorizedSignal';
import type {
  DeckCard, DeckView, RevealInput, RevealResult, ReviewInput, ReviewResult, SessionSummary,
} from '../../src/domain/types';

export const summary = (over: Partial<SessionSummary> = {}): SessionSummary => ({
  started: false, sessionDate: '2026-01-01', cycleDay: 1, levelsDue: [2, 1], isCatchUp: false,
  newCardsAdded: 10, skipNewCards: false, currentLevel: 1, status: 'not_started', ...over,
});

export const deckCard = (id: number, word: string): DeckCard => ({
  flashcardId: id, photoUrl: `https://img/${id}.png`, description: `desc ${id}`, letterCount: [...word].length,
});

/**
 * A tiny in-memory stand-in for the backend's Level 1 behaviour: a passed card leaves the deck,
 * a failed card goes to the back, and the session completes when the deck is empty.
 */
export class FakeBackend implements DeckGateway, ReviewGateway {
  deck: DeckCard[];
  submitted: ReviewInput[] = [];
  failNextReveal = false;
  failNextSubmit = false;

  constructor(private readonly words: Record<number, { word: string; phonetic: string | null }>) {
    this.deck = Object.entries(words).map(([id, w]) => deckCard(Number(id), w.word));
  }

  async current(): Promise<DeckView> {
    return { sessionComplete: this.deck.length === 0, level: this.deck.length ? 1 : null, cards: [...this.deck] };
  }

  async reveal(input: RevealInput): Promise<RevealResult> {
    if (this.failNextReveal) {
      this.failNextReveal = false;
      throw new Error('boom');
    }
    const w = this.words[input.flashcardId]!;
    return {
      spellingCorrect: input.spellingInput.trim().toLowerCase() === w.word.toLowerCase(),
      correctSpelling: w.word,
      phoneticSpelling: w.phonetic,
    };
  }

  async submit(input: ReviewInput): Promise<ReviewResult> {
    if (this.failNextSubmit) {
      this.failNextSubmit = false;
      throw new Error('boom');
    }
    this.submitted.push(input);
    const revealed = await this.reveal(input);
    const passed = revealed.spellingCorrect && input.pronunciationCorrect;
    const [card] = this.deck.splice(this.deck.findIndex((c) => c.flashcardId === input.flashcardId), 1);
    if (!passed && card) this.deck.push(card);
    return { ...revealed, passed, newLevel: passed ? 2 : 1, sessionComplete: this.deck.length === 0, currentLevel: this.deck.length ? 1 : null };
  }
}

export type FakeServices = Services & { signal: UnauthorizedSignal; tokenStore: InMemoryTokenStorage };

/** Services where every gateway is a vi.fn that resolves to a sensible default; override per test. */
export function createFakeServices(over: Partial<Services> = {}): FakeServices {
  const tokenStore = new InMemoryTokenStorage();
  const signal = new UnauthorizedSignal();
  const session: SessionGateway = {
    today: vi.fn(async () => summary()),
    start: vi.fn(async (skip: boolean) => summary({ started: true, status: 'in_progress', skipNewCards: skip })),
  };
  const services: FakeServices = {
    auth: {
      login: vi.fn(async () => ({ userId: 1, token: 'tok-login' })),
      register: vi.fn(async () => ({ userId: 2, token: 'tok-register' })),
    },
    session,
    deck: { current: vi.fn(async () => ({ sessionComplete: true, level: null, cards: [] })) },
    review: {
      reveal: vi.fn(async () => ({ spellingCorrect: true, correctSpelling: 'x', phoneticSpelling: null })),
      submit: vi.fn(async () => ({
        spellingCorrect: true, correctSpelling: 'x', phoneticSpelling: null,
        passed: true, newLevel: 2 as const, sessionComplete: true, currentLevel: null,
      })),
    },
    flashcards: { add: vi.fn() },
    tokens: tokenStore,
    sessionExpired: signal,
    signal,
    tokenStore,
    ...over,
  };
  return services;
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } } });
}

/** A wrapper component that provides services, a fresh QueryClient and (optionally) auth and a router. */
export function makeWrapper(services: Services, options: { auth?: boolean; queryClient?: QueryClient; route?: string } = {}) {
  const queryClient = options.queryClient ?? createTestQueryClient();
  function TestProviders({ children }: { children: ReactNode }) {
    const content = options.auth ? <AuthProvider>{children}</AuthProvider> : children;
    return (
      <ServicesProvider services={services}>
        <QueryClientProvider client={queryClient}>
          {options.route ? <MemoryRouter initialEntries={[options.route]}>{content}</MemoryRouter> : content}
        </QueryClientProvider>
      </ServicesProvider>
    );
  }
  return { wrapper: TestProviders, queryClient };
}

export function renderWithServices(ui: ReactElement, services: Services, options: { auth?: boolean; route?: string } = {}) {
  const { wrapper, queryClient } = makeWrapper(services, options);
  return { ...render(ui, { wrapper }), queryClient };
}
