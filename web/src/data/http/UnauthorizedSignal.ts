import type { SessionExpiredSignal } from '../../application/ports/SessionExpiredSignal';

/** Tiny event emitter: the HTTP client calls `notify()` on a 401, the AuthProvider subscribes. */
export class UnauthorizedSignal implements SessionExpiredSignal {
  private listeners = new Set<() => void>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }

  notify = (): void => {
    for (const listener of [...this.listeners]) listener();
  };
}
