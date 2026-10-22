import type { Clock } from '../ports/Clock.js';

export class SystemClock implements Clock {
  today(timeZone: string): string {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }
  now(): string {
    return new Date().toISOString();
  }
}
