import { ConflictError } from '../../domain/errors.js';
import type { UserRecord, UserRepository } from '../../ports/UserRepository.js';
import type { Db } from './database.js';

export class SqliteUserRepository implements UserRepository {
  constructor(private readonly db: Db) {}

  findByEmail(email: string): UserRecord | null {
    const row = this.db
      .prepare('SELECT user_id, email, password_hash FROM users WHERE email = ?')
      .get(email) as { user_id: number; email: string; password_hash: string } | undefined;
    return row ? { userId: row.user_id, email: row.email, passwordHash: row.password_hash } : null;
  }

  create(email: string, passwordHash: string): number {
    try {
      return Number(this.db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, passwordHash).lastInsertRowid);
    } catch (err) {
      if ((err as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') throw new ConflictError('Email already registered');
      throw err;
    }
  }
}
