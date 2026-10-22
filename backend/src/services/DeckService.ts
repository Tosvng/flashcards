import { NotFoundError } from '../domain/errors.js';
import type { DailySession, Level } from '../domain/types.js';
import type { CardStateRepository } from '../ports/CardStateRepository.js';
import type { Clock } from '../ports/Clock.js';
import type { FlashcardRepository } from '../ports/FlashcardRepository.js';
import type { SessionRepository } from '../ports/SessionRepository.js';
import type { TodayResolver } from './TodayResolver.js';

/** What the client may see before answering: never the French word itself. */
export interface DeckCard {
  flashcardId: number;
  photoUrl: string;
  description: string;
  letterCount: number;
}

export interface DeckView {
  sessionComplete: boolean;
  level: Level | null;
  cards: DeckCard[];
}

export class DeckService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly cardStates: CardStateRepository,
    private readonly flashcards: FlashcardRepository,
    private readonly todayResolver: TodayResolver,
    private readonly clock: Clock,
  ) {}

  currentDeck(userId: number): DeckView {
    const { today } = this.todayResolver.resolve(userId);
    const session = this.sessions.findByDate(userId, today);
    if (!session) throw new NotFoundError("Today's session has not been started");
    if (session.status === 'complete' || session.currentLevel === null) {
      return { sessionComplete: true, level: null, cards: [] };
    }

    const states = this.cardStates.listByLevel(userId, session.currentLevel);
    const byId = new Map(
      this.flashcards.findManyVisible(userId, states.map((s) => s.flashcardId)).map((c) => [c.flashcardId, c]),
    );
    const cards = states.flatMap((s) => {
      const card = byId.get(s.flashcardId);
      return card
        ? [{ flashcardId: card.flashcardId, photoUrl: card.photoUrl, description: card.description, letterCount: [...card.frenchText].length }]
        : [];
    });
    return { sessionComplete: false, level: session.currentLevel, cards };
  }

  /**
   * Moves `currentLevel` down the due list until it points at a non-empty level.
   * Marks the session complete when no due level has cards left. Persists the result.
   */
  advanceIfEmpty(userId: number, session: DailySession): DailySession {
    if (session.status === 'complete') return session;

    let level = session.currentLevel;
    while (level !== null && this.cardStates.countByLevel(userId, level) === 0) {
      const next = session.levelsDue[session.levelsDue.indexOf(level) + 1];
      level = next ?? null;
    }

    const updated: DailySession =
      level === null
        ? { ...session, currentLevel: null, status: 'complete', completedAt: this.clock.now() }
        : { ...session, currentLevel: level };
    this.sessions.update(userId, updated);
    return updated;
  }
}
