import { NotFoundError } from '../domain/errors.js';
import type { IsoDate, UserSettings } from '../domain/types.js';
import type { Clock } from '../ports/Clock.js';
import type { SettingsRepository } from '../ports/SettingsRepository.js';

export interface UserDay {
  today: IsoDate;
  settings: UserSettings;
}

/** Resolves a user's settings and their local "today" (each user has their own time zone). */
export class TodayResolver {
  constructor(
    private readonly settings: SettingsRepository,
    private readonly clock: Clock,
  ) {}

  resolve(userId: number): UserDay {
    const settings = this.settings.get(userId);
    if (!settings) throw new NotFoundError('User settings not found');
    return { today: this.clock.today(settings.timeZone), settings };
  }
}
