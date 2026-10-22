import type { CardLevel, CardState, IsoDate, Level } from '../../domain/types.js';
import type { CardStateRepository } from '../../ports/CardStateRepository.js';
import type { Db } from './database.js';

interface Row {
  flashcard_id: number;
  level: number;
  introduced_on: string;
  last_reviewed_on: string | null;
  deck_position: number;
}

const toState = (r: Row): CardState => ({
  flashcardId: r.flashcard_id,
  level: r.level as CardLevel,
  introducedOn: r.introduced_on,
  lastReviewedOn: r.last_reviewed_on,
  deckPosition: r.deck_position,
});

const VISIBLE_AND_UNSEEN = `
  (f.owner_user_id IS NULL OR f.owner_user_id = :user)
  AND NOT EXISTS (SELECT 1 FROM card_state c WHERE c.user_id = :user AND c.flashcard_id = f.flashcard_id)`;

export class SqliteCardStateRepository implements CardStateRepository {
  constructor(private readonly db: Db) {}

  listByLevel(userId: number, level: Level): CardState[] {
    return (
      this.db
        .prepare('SELECT * FROM card_state WHERE user_id = ? AND level = ? ORDER BY deck_position')
        .all(userId, level) as Row[]
    ).map(toState);
  }

  countByLevel(userId: number, level: Level): number {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM card_state WHERE user_id = ? AND level = ?').get(userId, level) as { n: number }).n;
  }

  get(userId: number, flashcardId: number): CardState | null {
    const row = this.db.prepare('SELECT * FROM card_state WHERE user_id = ? AND flashcard_id = ?').get(userId, flashcardId) as Row | undefined;
    return row ? toState(row) : null;
  }

  save(userId: number, flashcardId: number, level: CardLevel, reviewedOn: IsoDate): void {
    this.db
      .prepare('UPDATE card_state SET level = ?, last_reviewed_on = ? WHERE user_id = ? AND flashcard_id = ?')
      .run(level, reviewedOn, userId, flashcardId);
  }

  moveToBack(userId: number, flashcardId: number): void {
    this.db
      .prepare(
        `UPDATE card_state
         SET deck_position = (SELECT COALESCE(MAX(deck_position), 0) + 1 FROM card_state WHERE user_id = ?)
         WHERE user_id = ? AND flashcard_id = ?`,
      )
      .run(userId, userId, flashcardId);
  }

  introduceFromPool(userId: number, limit: number, date: IsoDate): number {
    const base = (this.db.prepare('SELECT COALESCE(MAX(deck_position), 0) AS m FROM card_state WHERE user_id = ?').get(userId) as { m: number }).m;
    return this.db
      .prepare(
        `INSERT INTO card_state (user_id, flashcard_id, level, introduced_on, last_reviewed_on, deck_position)
         SELECT :user, f.flashcard_id, 1, :date, NULL, :base + ROW_NUMBER() OVER (ORDER BY f.sort_order, f.flashcard_id)
         FROM flashcards f
         WHERE ${VISIBLE_AND_UNSEEN}
         ORDER BY f.sort_order, f.flashcard_id
         LIMIT :limit`,
      )
      .run({ user: userId, date, base, limit }).changes;
  }

  countInPool(userId: number): number {
    return (this.db.prepare(`SELECT COUNT(*) AS n FROM flashcards f WHERE ${VISIBLE_AND_UNSEEN}`).get({ user: userId }) as { n: number }).n;
  }
}
