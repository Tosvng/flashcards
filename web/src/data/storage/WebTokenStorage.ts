import type { TokenStorage } from '../../application/ports/TokenStorage';

const KEY = 'flashcards.auth.token';

/**
 * Browser token storage (localStorage).
 * Falls back to memory when storage is unavailable (private mode, blocked cookies), so the app still
 * works for the current page load. Note: unlike the Keychain, localStorage is readable by any script
 * on the page, so keep the PWA free of third-party scripts.
 */
export class WebTokenStorage implements TokenStorage {
  private memory: string | null = null;

  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null = safeLocalStorage()) {}

  async get(): Promise<string | null> {
    try {
      return this.storage?.getItem(KEY) ?? this.memory;
    } catch {
      return this.memory;
    }
  }

  async set(token: string): Promise<void> {
    this.memory = token;
    try {
      this.storage?.setItem(KEY, token);
    } catch {
      /* memory copy above is the fallback */
    }
  }

  async clear(): Promise<void> {
    this.memory = null;
    try {
      this.storage?.removeItem(KEY);
    } catch {
      /* nothing stored */
    }
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // access itself can throw when storage is blocked
  }
}
