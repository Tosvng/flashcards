import type { UnitOfWork } from '../../ports/UnitOfWork.js';
import type { Db } from './database.js';

export class SqliteUnitOfWork implements UnitOfWork {
  constructor(private readonly db: Db) {}

  /** better-sqlite3 transactions nest via savepoints, so services may nest run() safely. */
  run<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }
}
