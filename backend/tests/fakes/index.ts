import { ConflictError } from '../../src/domain/errors.js';
import type {
  CardLevel, CardState, DailySession, Flashcard, IsoDate, Level, NewFlashcard,
  ReviewLogEntry, UserSettings,
} from '../../src/domain/types.js';
import type { CardStateRepository } from '../../src/ports/CardStateRepository.js';
import type { Clock } from '../../src/ports/Clock.js';
import type { FlashcardRepository } from '../../src/ports/FlashcardRepository.js';
import type { PasswordHasher } from '../../src/ports/PasswordHasher.js';
import type { ReviewLogRepository } from '../../src/ports/ReviewLogRepository.js';
import type { SessionRepository } from '../../src/ports/SessionRepository.js';
import type { SettingsRepository } from '../../src/ports/SettingsRepository.js';
import type { TokenService } from '../../src/ports/TokenService.js';
import type { UnitOfWork } from '../../src/ports/UnitOfWork.js';
import type { UserRecord, UserRepository } from '../../src/ports/UserRepository.js';
import { UnauthorizedError } from '../../src/domain/errors.js';

export class FixedClock implements Clock {
  constructor(public date: IsoDate) {}
  today(): IsoDate { return this.date; }
  now(): string { return `${this.date}T12:00:00.000Z`; }
}

export class PassThroughUnitOfWork implements UnitOfWork {
  run<T>(fn: () => T): T { return fn(); }
}

export class FakeFlashcardRepository implements FlashcardRepository {
  cards: Flashcard[] = [];
  private nextId = 1;
  findVisible(userId: number, id: number): Flashcard | null {
    return this.cards.find((c) => c.flashcardId === id && this.visible(c, userId)) ?? null;
  }
  findManyVisible(userId: number, ids: number[]): Flashcard[] {
    return this.cards.filter((c) => ids.includes(c.flashcardId) && this.visible(c, userId));
  }
  create(userId: number, card: NewFlashcard): Flashcard {
    const created: Flashcard = {
      ...card, flashcardId: this.nextId++, ownerUserId: userId,
      sortOrder: this.cards.length + 1, createdAt: '2026-01-01T00:00:00.000Z',
    };
    this.cards.push(created);
    return created;
  }
  findOwned(userId: number): Flashcard[] {
    return this.cards.filter((c) => c.ownerUserId === userId);
  }
  update(userId: number, id: number, card: NewFlashcard): Flashcard | null {
    const i = this.cards.findIndex((c) => c.flashcardId === id && c.ownerUserId === userId);
    if (i < 0) return null;
    this.cards[i] = { ...this.cards[i]!, ...card };
    return this.cards[i]!;
  }
  delete(userId: number, id: number): boolean {
    const i = this.cards.findIndex((c) => c.flashcardId === id && c.ownerUserId === userId);
    if (i < 0) return false;
    this.cards.splice(i, 1);
    return true;
  }
  /** Test helper: add a shared library card. */
  addShared(frenchText: string, phonetic: string | null = null): Flashcard {
    const created: Flashcard = {
      flashcardId: this.nextId++, ownerUserId: null, sortOrder: this.cards.length + 1,
      frenchText, englishTranslation: frenchText, photoUrl: `/img/${frenchText}.png`,
      description: `desc ${frenchText}`, phoneticSpelling: phonetic, createdAt: '2026-01-01T00:00:00.000Z',
    };
    this.cards.push(created);
    return created;
  }
  visible(c: Flashcard, userId: number): boolean {
    return c.ownerUserId === null || c.ownerUserId === userId;
  }
}

export class FakeCardStateRepository implements CardStateRepository {
  private states = new Map<string, CardState>();
  constructor(private readonly flashcards: FakeFlashcardRepository) {}
  private key(u: number, f: number) { return `${u}:${f}`; }
  private forUser(u: number) { return [...this.states.entries()].filter(([k]) => k.startsWith(`${u}:`)).map(([, v]) => v); }
  private nextPosition(u: number) { return Math.max(0, ...this.forUser(u).map((s) => s.deckPosition)) + 1; }

  listByLevel(u: number, level: Level): CardState[] {
    return this.forUser(u).filter((s) => s.level === level).sort((a, b) => a.deckPosition - b.deckPosition);
  }
  countByLevel(u: number, level: Level): number { return this.listByLevel(u, level).length; }
  get(u: number, f: number): CardState | null { return this.states.get(this.key(u, f)) ?? null; }
  save(u: number, f: number, level: CardLevel, reviewedOn: IsoDate): void {
    const s = this.get(u, f);
    if (!s) throw new Error('no state');
    this.states.set(this.key(u, f), { ...s, level, lastReviewedOn: reviewedOn });
  }
  moveToBack(u: number, f: number): void {
    const s = this.get(u, f);
    if (s) this.states.set(this.key(u, f), { ...s, deckPosition: this.nextPosition(u) });
  }
  private pool(u: number) {
    return this.flashcards.cards
      .filter((c) => this.flashcards.visible(c, u) && !this.get(u, c.flashcardId))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }
  introduceFromPool(u: number, limit: number, date: IsoDate): number {
    const picked = this.pool(u).slice(0, limit);
    for (const c of picked) {
      this.states.set(this.key(u, c.flashcardId), {
        flashcardId: c.flashcardId, level: 1, introducedOn: date, lastReviewedOn: null,
        deckPosition: this.nextPosition(u),
      });
    }
    return picked.length;
  }
  countInPool(u: number): number { return this.pool(u).length; }
  /** Test helper: place a card directly at a level. */
  place(u: number, f: number, level: CardLevel): void {
    this.states.set(this.key(u, f), {
      flashcardId: f, level, introducedOn: '2026-01-01', lastReviewedOn: null, deckPosition: this.nextPosition(u),
    });
  }
}

export class FakeReviewLogRepository implements ReviewLogRepository {
  entries: Array<{ userId: number; entry: ReviewLogEntry }> = [];
  append(userId: number, entry: ReviewLogEntry): void { this.entries.push({ userId, entry }); }
}

export class FakeSessionRepository implements SessionRepository {
  private sessions = new Map<string, DailySession>();
  private key(u: number, d: IsoDate) { return `${u}:${d}`; }
  findByDate(u: number, d: IsoDate) { const s = this.sessions.get(this.key(u, d)); return s ? structuredClone(s) : null; }
  findLastComplete(u: number, before: IsoDate) {
    const found = [...this.sessions.entries()]
      .filter(([k, s]) => k.startsWith(`${u}:`) && s.status === 'complete' && s.sessionDate < before)
      .map(([, s]) => s)
      .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))[0];
    return found ? structuredClone(found) : null;
  }
  create(u: number, s: DailySession) { this.sessions.set(this.key(u, s.sessionDate), structuredClone(s)); }
  update(u: number, s: DailySession) { this.sessions.set(this.key(u, s.sessionDate), structuredClone(s)); }
}

export class FakeSettingsRepository implements SettingsRepository {
  private settings = new Map<number, UserSettings>();
  get(u: number) { return this.settings.get(u) ?? null; }
  initialize(u: number, startDate: IsoDate, timeZone: string) {
    this.settings.set(u, { startDate, newCardsPerDay: 10, timeZone });
  }
  set(u: number, s: Partial<UserSettings>) { this.settings.set(u, { ...this.settings.get(u)!, ...s }); }
}

export class FakeUserRepository implements UserRepository {
  users: UserRecord[] = [];
  findByEmail(email: string) { return this.users.find((u) => u.email === email) ?? null; }
  create(email: string, passwordHash: string) {
    if (this.findByEmail(email)) throw new ConflictError('Email already registered');
    const userId = this.users.length + 1;
    this.users.push({ userId, email, passwordHash });
    return userId;
  }
}

export class FakePasswordHasher implements PasswordHasher {
  async hash(plain: string) { return `hashed:${plain}`; }
  async verify(plain: string, hash: string) { return hash === `hashed:${plain}`; }
}

export class FakeTokenService implements TokenService {
  issue(userId: number) { return `token-${userId}`; }
  verify(token: string) {
    const m = /^token-(\d+)$/.exec(token);
    if (!m) throw new UnauthorizedError('Invalid token');
    return Number(m[1]);
  }
}
