import type { DailySession, IsoDate, Level, SessionStatus } from '../../domain/types.js';
import type { SessionRepository } from '../../ports/SessionRepository.js';
import type { Db } from './database.js';

interface Row {
  session_date: string;
  cycle_day: number;
  levels_due: string;
  is_catch_up: number;
  skip_new_cards: number;
  new_cards_added: number;
  current_level: number | null;
  status: string;
  completed_at: string | null;
}

const toSession = (r: Row): DailySession => ({
  sessionDate: r.session_date,
  cycleDay: r.cycle_day,
  levelsDue: JSON.parse(r.levels_due) as Level[],
  isCatchUp: r.is_catch_up === 1,
  skipNewCards: r.skip_new_cards === 1,
  newCardsAdded: r.new_cards_added,
  currentLevel: r.current_level as Level | null,
  status: r.status as SessionStatus,
  completedAt: r.completed_at,
});

export class SqliteSessionRepository implements SessionRepository {
  constructor(private readonly db: Db) {}

  findByDate(userId: number, date: IsoDate): DailySession | null {
    const row = this.db.prepare('SELECT * FROM daily_sessions WHERE user_id = ? AND session_date = ?').get(userId, date) as Row | undefined;
    return row ? toSession(row) : null;
  }

  findLastComplete(userId: number, before: IsoDate): DailySession | null {
    const row = this.db
      .prepare("SELECT * FROM daily_sessions WHERE user_id = ? AND status = 'complete' AND session_date < ? ORDER BY session_date DESC LIMIT 1")
      .get(userId, before) as Row | undefined;
    return row ? toSession(row) : null;
  }

  create(userId: number, s: DailySession): void {
    this.db
      .prepare(
        `INSERT INTO daily_sessions (user_id, session_date, cycle_day, levels_due, is_catch_up, skip_new_cards,
                                     new_cards_added, current_level, status, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        userId, s.sessionDate, s.cycleDay, JSON.stringify(s.levelsDue), Number(s.isCatchUp), Number(s.skipNewCards),
        s.newCardsAdded, s.currentLevel, s.status, s.completedAt,
      );
  }

  update(userId: number, s: DailySession): void {
    this.db
      .prepare(
        `UPDATE daily_sessions
         SET new_cards_added = ?, current_level = ?, status = ?, completed_at = ?
         WHERE user_id = ? AND session_date = ?`,
      )
      .run(s.newCardsAdded, s.currentLevel, s.status, s.completedAt, userId, s.sessionDate);
  }
}
