import type { LevelScheduler } from '../domain/LevelScheduler.js';
import type { DailySession, IsoDate, Level, UserSettings } from '../domain/types.js';
import type { CardStateRepository } from '../ports/CardStateRepository.js';
import type { SessionRepository } from '../ports/SessionRepository.js';
import type { UnitOfWork } from '../ports/UnitOfWork.js';
import type { DeckService } from './DeckService.js';
import type { NewCardIntroducer } from './NewCardIntroducer.js';
import type { TodayResolver } from './TodayResolver.js';

export interface SessionSummary {
  /** False for a read-only preview of a session that has not been started yet. */
  started: boolean;
  sessionDate: IsoDate;
  cycleDay: number;
  levelsDue: Level[];
  isCatchUp: boolean;
  /** Cards actually added today (started) or that would be added (preview). */
  newCardsAdded: number;
  skipNewCards: boolean;
  currentLevel: Level | null;
  status: 'not_started' | 'in_progress' | 'complete';
}

export class SessionService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly cardStates: CardStateRepository,
    private readonly scheduler: LevelScheduler,
    private readonly introducer: NewCardIntroducer,
    private readonly deck: DeckService,
    private readonly todayResolver: TodayResolver,
    private readonly uow: UnitOfWork,
  ) {}

  /** Read-only: today's session if started, otherwise what starting it would do. Never mutates. */
  preview(userId: number): SessionSummary {
    const { today, settings } = this.todayResolver.resolve(userId);
    const existing = this.sessions.findByDate(userId, today);
    if (existing) return this.summarize(existing, true);

    const due = this.dueFor(userId, settings, today);
    const newCards = Math.min(settings.newCardsPerDay, this.cardStates.countInPool(userId));
    // Same rule as a started session: the first due level that has cards (new cards will land in Level 1).
    const hasCards = (level: Level) => this.cardStates.countByLevel(userId, level) > 0 || (level === 1 && newCards > 0);
    return {
      started: false,
      sessionDate: today,
      cycleDay: due.cycleDay,
      levelsDue: due.levels,
      isCatchUp: due.isCatchUp,
      newCardsAdded: newCards,
      skipNewCards: false,
      currentLevel: due.levels.find(hasCards) ?? null,
      status: 'not_started',
    };
  }

  /** Starts today's session, or returns the existing one (idempotent, so new cards are added once). */
  start(userId: number, skipNewCards: boolean): SessionSummary {
    return this.uow.run(() => {
      const { today, settings } = this.todayResolver.resolve(userId);
      const existing = this.sessions.findByDate(userId, today);
      if (existing) return this.summarize(existing, true);

      const due = this.dueFor(userId, settings, today);
      const draft: DailySession = {
        sessionDate: today,
        cycleDay: due.cycleDay,
        levelsDue: due.levels,
        isCatchUp: due.isCatchUp,
        skipNewCards,
        newCardsAdded: 0,
        currentLevel: due.levels[0] ?? null,
        status: 'in_progress',
        completedAt: null,
      };
      draft.newCardsAdded = this.introducer.introduce(userId, draft, settings);
      this.sessions.create(userId, draft);
      return this.summarize(this.deck.advanceIfEmpty(userId, draft), true);
    });
  }

  private dueFor(userId: number, settings: UserSettings, today: IsoDate) {
    // A time-zone change can put "today" before the start date; never schedule before day 1.
    const start = settings.startDate > today ? today : settings.startDate;
    const last = this.sessions.findLastComplete(userId, today);
    return this.scheduler.levelsDue(start, last?.sessionDate ?? null, today);
  }

  private summarize(s: DailySession, started: boolean): SessionSummary {
    return {
      started,
      sessionDate: s.sessionDate,
      cycleDay: s.cycleDay,
      levelsDue: s.levelsDue,
      isCatchUp: s.isCatchUp,
      newCardsAdded: s.newCardsAdded,
      skipNewCards: s.skipNewCards,
      currentLevel: s.currentLevel,
      status: s.status,
    };
  }
}
