import { COMPLETED, type CardLevel } from './types.js';

export interface ProgressionResult {
  level: CardLevel;
  /** True when the card must go to the back of the Level 1 deck. */
  requeueAtBack: boolean;
}

export interface LevelProgressionRule {
  next(level: CardLevel, passed: boolean): ProgressionResult;
}

/** Leitner box rules: pass = up one level (7 -> Completed); fail = back to Level 1. */
export class LeitnerProgressionRule implements LevelProgressionRule {
  next(level: CardLevel, passed: boolean): ProgressionResult {
    if (level === COMPLETED) throw new Error('Completed cards are not reviewed');
    if (!passed) return { level: 1, requeueAtBack: true };
    return { level: (level === 7 ? COMPLETED : level + 1) as CardLevel, requeueAtBack: false };
  }
}
