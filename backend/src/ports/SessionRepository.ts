import type { DailySession, IsoDate } from '../domain/types.js';

export interface SessionRepository {
  findByDate(userId: number, date: IsoDate): DailySession | null;
  /** Most recent session with status 'complete' strictly before `before`. */
  findLastComplete(userId: number, before: IsoDate): DailySession | null;
  create(userId: number, session: DailySession): void;
  update(userId: number, session: DailySession): void;
}
