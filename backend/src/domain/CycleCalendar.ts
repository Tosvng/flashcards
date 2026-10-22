import { CYCLE_LENGTH, type IsoDate } from './types.js';

const MS_PER_DAY = 86_400_000;

function toUtcMs(date: IsoDate): number {
  const ms = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(ms)) throw new Error(`Invalid ISO date: ${date}`);
  return ms;
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return new Date(toUtcMs(date) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Cycle day 1-64: ((days since startDate) mod 64) + 1. */
export function cycleDayFor(startDate: IsoDate, date: IsoDate): number {
  const elapsed = daysBetween(startDate, date);
  if (elapsed < 0) throw new Error(`${date} is before the cycle start ${startDate}`);
  return (elapsed % CYCLE_LENGTH) + 1;
}
