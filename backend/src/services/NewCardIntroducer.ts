import type { DailySession, UserSettings } from '../domain/types.js';
import type { CardStateRepository } from '../ports/CardStateRepository.js';

/** New-card policy: move up to `newCardsPerDay` cards from the New pool into Level 1, once per day. */
export class NewCardIntroducer {
  constructor(private readonly cardStates: CardStateRepository) {}

  introduce(userId: number, session: DailySession, settings: UserSettings): number {
    if (session.skipNewCards || session.newCardsAdded > 0) return 0;
    return this.cardStates.introduceFromPool(userId, settings.newCardsPerDay, session.sessionDate);
  }
}
