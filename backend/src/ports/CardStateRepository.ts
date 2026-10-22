import type { CardLevel, CardState, IsoDate, Level } from '../domain/types.js';

export interface CardStateRepository {
  /** Cards in a level, ordered by deck position. */
  listByLevel(userId: number, level: Level): CardState[];
  countByLevel(userId: number, level: Level): number;
  get(userId: number, flashcardId: number): CardState | null;
  /** Updates level and review date of an existing card. */
  save(userId: number, flashcardId: number, level: CardLevel, reviewedOn: IsoDate): void;
  /** Puts the card at the end of its current level's deck. */
  moveToBack(userId: number, flashcardId: number): void;
  /**
   * Inserts Level 1 rows for up to `limit` visible cards that have no state yet
   * (the New pool), in sort_order. Returns how many were introduced.
   */
  introduceFromPool(userId: number, limit: number, date: IsoDate): number;
  /** Visible cards with no state yet. */
  countInPool(userId: number): number;
}
