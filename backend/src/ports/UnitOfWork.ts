export interface UnitOfWork {
  /** Runs `fn` atomically: commits on return, rolls back if it throws. */
  run<T>(fn: () => T): T;
}
