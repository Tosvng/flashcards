import type { TokenStorage } from '../../application/ports/TokenStorage';

/** Non-persistent TokenStorage, interchangeable with SecureTokenStorage (used in tests). */
export class InMemoryTokenStorage implements TokenStorage {
  constructor(private token: string | null = null) {}
  async get(): Promise<string | null> {
    return this.token;
  }
  async set(token: string): Promise<void> {
    this.token = token;
  }
  async clear(): Promise<void> {
    this.token = null;
  }
}
