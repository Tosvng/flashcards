import type { Level } from './types.js';

/**
 * The 64-day Game Schedule (LeitnerSchedule.pdf). Index 0 = cycle day 1.
 * Each day's levels are listed highest first, Level 1 last (review order).
 */
export const GAME_SCHEDULE: ReadonlyArray<readonly Level[]> = [
  // Days 1-16
  [2, 1], [3, 1], [2, 1], [4, 1], [2, 1], [3, 1], [2, 1], [1],
  [2, 1], [3, 1], [2, 1], [5, 1], [4, 2, 1], [3, 1], [2, 1], [1],
  // Days 17-32
  [2, 1], [3, 1], [2, 1], [4, 1], [2, 1], [3, 1], [2, 1], [6, 1],
  [2, 1], [3, 1], [2, 1], [5, 1], [4, 2, 1], [3, 1], [2, 1], [1],
  // Days 33-48
  [2, 1], [3, 1], [2, 1], [4, 1], [2, 1], [3, 1], [2, 1], [1],
  [2, 1], [3, 1], [2, 1], [5, 1], [4, 2, 1], [3, 1], [2, 1], [1],
  // Days 49-64
  [2, 1], [3, 1], [2, 1], [4, 1], [2, 1], [3, 1], [2, 1], [7, 1],
  [2, 1], [3, 1], [6, 2, 1], [5, 1], [4, 2, 1], [3, 1], [2, 1], [1],
];
