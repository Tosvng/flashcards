import argon2 from 'argon2';
import type { PasswordHasher } from '../ports/PasswordHasher.js';

export class Argon2PasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain);
  }
  async verify(plain: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false; // malformed hash
    }
  }
}
