import Database from 'better-sqlite3';
import { MIGRATIONS, type Migration } from './migrations.js';

export type Db = Database.Database;

export function openDatabase(path: string): Db {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

/** Applies pending migrations in order, each in its own transaction, tracked in schema_version. */
export function runMigrations(db: Db, migrations: readonly Migration[] = MIGRATIONS): void {
  db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)');
  const current = (db.prepare('SELECT COALESCE(MAX(version), 0) AS v FROM schema_version').get() as { v: number }).v;
  for (const m of migrations.filter((m) => m.version > current).sort((a, b) => a.version - b.version)) {
    db.transaction(() => {
      db.exec(m.sql);
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(m.version);
    })();
  }
}
