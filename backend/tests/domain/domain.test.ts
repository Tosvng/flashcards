import { describe, expect, it } from 'vitest';
import { GAME_SCHEDULE } from '../../src/domain/gameSchedule.js';
import { addDays, cycleDayFor, daysBetween } from '../../src/domain/CycleCalendar.js';
import { LevelScheduler } from '../../src/domain/LevelScheduler.js';
import { LeitnerProgressionRule } from '../../src/domain/ReviewRules.js';
import { StrictAccentSpellingJudge } from '../../src/domain/SpellingJudge.js';

const scheduler = new LevelScheduler(GAME_SCHEDULE);

describe('gameSchedule', () => {
  it('has 64 days, each sorted descending and ending in level 1', () => {
    expect(GAME_SCHEDULE).toHaveLength(64);
    for (const levels of GAME_SCHEDULE) {
      expect(levels.at(-1)).toBe(1);
      expect([...levels].sort((a, b) => b - a)).toEqual([...levels]);
    }
  });

  it('matches spot checks from the PDF', () => {
    const day = (n: number) => [...GAME_SCHEDULE[n - 1]!];
    expect(day(1)).toEqual([2, 1]);
    expect(day(8)).toEqual([1]);
    expect(day(13)).toEqual([4, 2, 1]);
    expect(day(24)).toEqual([6, 1]);
    expect(day(56)).toEqual([7, 1]);
    expect(day(59)).toEqual([6, 2, 1]);
    expect(day(64)).toEqual([1]);
  });

  it('schedules every level 1-7 at least once', () => {
    const seen = new Set(GAME_SCHEDULE.flat());
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});

describe('CycleCalendar', () => {
  it('computes cycle days and wraps 64 -> 1', () => {
    expect(cycleDayFor('2026-01-01', '2026-01-01')).toBe(1);
    expect(cycleDayFor('2026-01-01', '2026-03-05')).toBe(64);
    expect(cycleDayFor('2026-01-01', '2026-03-06')).toBe(1);
  });
  it('rejects dates before the start', () => {
    expect(() => cycleDayFor('2026-01-02', '2026-01-01')).toThrow();
  });
  it('adds and diffs days across month boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(daysBetween('2026-01-01', '2026-03-01')).toBe(59);
  });
});

describe('LevelScheduler', () => {
  const start = '2026-01-01';

  it('returns just today when nothing was missed', () => {
    const today = addDays(start, 2); // day 3
    expect(scheduler.levelsDue(start, addDays(start, 1), today)).toEqual({
      cycleDay: 3, levels: [2, 1], isCatchUp: false,
    });
  });

  it('first session ever returns only today', () => {
    expect(scheduler.levelsDue(start, null, start)).toEqual({ cycleDay: 1, levels: [2, 1], isCatchUp: false });
  });

  it('catches up missed days: 57+58 missed, today 59 -> 6,3,2,1', () => {
    const day = (n: number) => addDays(start, n - 1);
    expect(scheduler.levelsDue(start, day(56), day(59))).toEqual({
      cycleDay: 59, levels: [6, 3, 2, 1], isCatchUp: true,
    });
  });

  it('makes every level due after a gap of 64+ days', () => {
    const result = scheduler.levelsDue(start, start, addDays(start, 64));
    expect(result.levels).toEqual([7, 6, 5, 4, 3, 2, 1]);
    expect(result.isCatchUp).toBe(true);
  });

  it('rejects a schedule that is not 64 days', () => {
    expect(() => new LevelScheduler([[1]])).toThrow();
  });
});

describe('LeitnerProgressionRule', () => {
  const rule = new LeitnerProgressionRule();
  it('promotes on pass', () => {
    for (const level of [1, 2, 3, 4, 5, 6] as const) {
      expect(rule.next(level, true)).toEqual({ level: level + 1, requeueAtBack: false });
    }
  });
  it('completes after passing level 7', () => {
    expect(rule.next(7, true)).toEqual({ level: 8, requeueAtBack: false });
  });
  it('sends any failure to level 1 at the back of the deck', () => {
    for (const level of [1, 2, 3, 4, 5, 6, 7] as const) {
      expect(rule.next(level, false)).toEqual({ level: 1, requeueAtBack: true });
    }
  });
  it('refuses to review completed cards', () => {
    expect(() => rule.next(8, true)).toThrow();
  });
});

describe('StrictAccentSpellingJudge', () => {
  const judge = new StrictAccentSpellingJudge();
  it('ignores case and surrounding whitespace', () => {
    expect(judge.isCorrect('  Été ', 'été')).toBe(true);
  });
  it('treats accents as significant', () => {
    expect(judge.isCorrect('ete', 'été')).toBe(false);
  });
  it('normalizes composed vs decomposed accents', () => {
    expect(judge.isCorrect('été', 'été')).toBe(true);
  });
});
