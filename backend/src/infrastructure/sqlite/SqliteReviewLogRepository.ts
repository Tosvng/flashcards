import type { ReviewLogEntry } from '../../domain/types.js';
import type { ReviewLogRepository } from '../../ports/ReviewLogRepository.js';
import type { Db } from './database.js';

export class SqliteReviewLogRepository implements ReviewLogRepository {
  constructor(private readonly db: Db) {}

  append(userId: number, e: ReviewLogEntry): void {
    this.db
      .prepare(
        `INSERT INTO review_log (user_id, flashcard_id, session_date, cycle_day, level_before, level_after,
                                 spelling_correct, pronunciation_correct, passed, attempted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        userId, e.flashcardId, e.sessionDate, e.cycleDay, e.levelBefore, e.levelAfter,
        Number(e.spellingCorrect), Number(e.pronunciationCorrect), Number(e.passed), e.attemptedAt,
      );
  }
}
