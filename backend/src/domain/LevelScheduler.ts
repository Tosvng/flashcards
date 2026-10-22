import { addDays, cycleDayFor, daysBetween } from './CycleCalendar.js';
import { CYCLE_LENGTH, LEVELS, type IsoDate, type Level } from './types.js';

export interface LevelsDue {
  cycleDay: number;
  levels: Level[];
  isCatchUp: boolean;
}

/** Decides which levels are due on a given day, including catch-up after missed days. */
export class LevelScheduler {
  constructor(private readonly schedule: ReadonlyArray<readonly Level[]>) {
    if (schedule.length !== CYCLE_LENGTH) {
      throw new Error(`Schedule must have ${CYCLE_LENGTH} days, got ${schedule.length}`);
    }
  }

  levelsForDay(cycleDay: number): readonly Level[] {
    const levels = this.schedule[cycleDay - 1];
    if (!levels) throw new Error(`Invalid cycle day: ${cycleDay}`);
    return levels;
  }

  /**
   * Levels due today = union of the levels of every missed day (after the last
   * completed session) plus today, de-duplicated, highest first, Level 1 last.
   * A gap of 64+ days makes every level due.
   */
  levelsDue(startDate: IsoDate, lastCompleteDate: IsoDate | null, today: IsoDate): LevelsDue {
    const cycleDay = cycleDayFor(startDate, today);
    const gap = lastCompleteDate ? daysBetween(lastCompleteDate, today) : 1;

    if (gap >= CYCLE_LENGTH) {
      return { cycleDay, levels: [...LEVELS].reverse(), isCatchUp: true };
    }

    const days = gap > 1 ? gap : 1;
    const due = new Set<Level>();
    for (let i = days - 1; i >= 0; i--) {
      const date = addDays(today, -i);
      // Days before the user's start date have nothing scheduled.
      if (daysBetween(startDate, date) < 0) continue;
      for (const level of this.levelsForDay(cycleDayFor(startDate, date))) due.add(level);
    }
    return { cycleDay, levels: [...due].sort((a, b) => b - a), isCatchUp: days > 1 };
  }
}
