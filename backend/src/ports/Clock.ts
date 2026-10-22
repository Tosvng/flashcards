import type { IsoDate } from '../domain/types.js';

export interface Clock {
  /** The calendar date right now in the given IANA time zone. */
  today(timeZone: string): IsoDate;
  /** Current instant as an ISO timestamp. */
  now(): string;
}
