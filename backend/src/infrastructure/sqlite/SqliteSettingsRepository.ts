import type { IsoDate, UserSettings } from '../../domain/types.js';
import type { SettingsRepository } from '../../ports/SettingsRepository.js';
import type { Db } from './database.js';

export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private readonly db: Db) {}

  get(userId: number): UserSettings | null {
    const row = this.db
      .prepare('SELECT start_date, new_cards_per_day, time_zone FROM user_settings WHERE user_id = ?')
      .get(userId) as { start_date: string; new_cards_per_day: number; time_zone: string } | undefined;
    return row ? { startDate: row.start_date, newCardsPerDay: row.new_cards_per_day, timeZone: row.time_zone } : null;
  }

  initialize(userId: number, startDate: IsoDate, timeZone: string): void {
    this.db.prepare('INSERT INTO user_settings (user_id, start_date, time_zone) VALUES (?, ?, ?)').run(userId, startDate, timeZone);
  }
}
