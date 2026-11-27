import type { SessionSummary } from '../../domain/types';

export interface SessionGateway {
  /** Read-only: today's session, or a preview of what starting it will do. */
  today(): Promise<SessionSummary>;
  /** Idempotent: returns the existing session if already started. */
  start(skipNewCards: boolean): Promise<SessionSummary>;
  /** Once today's review is complete: reopens it with another batch of Level 1 cards. */
  loadMore(): Promise<SessionSummary>;
}
