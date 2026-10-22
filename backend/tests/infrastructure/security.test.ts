import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/env.js';
import { UnauthorizedError } from '../../src/domain/errors.js';
import { Argon2PasswordHasher } from '../../src/infrastructure/Argon2PasswordHasher.js';
import { JwtTokenService } from '../../src/infrastructure/JwtTokenService.js';
import { SystemClock } from '../../src/infrastructure/SystemClock.js';

const SECRET = 'x'.repeat(40);

describe('JwtTokenService', () => {
  const tokens = new JwtTokenService(SECRET, '1h');
  it('round-trips a user id', () => {
    expect(tokens.verify(tokens.issue(42))).toBe(42);
  });
  it('rejects tampered, foreign-secret, expired, and alg=none tokens', () => {
    const good = tokens.issue(1);
    expect(() => tokens.verify(good + 'x')).toThrow(UnauthorizedError);
    expect(() => new JwtTokenService('y'.repeat(40), '1h').verify(good)).toThrow(UnauthorizedError);
    expect(() => tokens.verify(jwt.sign({}, SECRET, { subject: '1', expiresIn: -10 }))).toThrow(UnauthorizedError);
    const none = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from('{"sub":"1"}').toString('base64url')}.`;
    expect(() => tokens.verify(none)).toThrow(UnauthorizedError);
  });
  it('rejects tokens without a numeric subject', () => {
    expect(() => tokens.verify(jwt.sign({}, SECRET))).toThrow(UnauthorizedError);
  });
});

describe('Argon2PasswordHasher', () => {
  const hasher = new Argon2PasswordHasher();
  it('hashes with a salt and verifies', async () => {
    const a = await hasher.hash('secret-password');
    const b = await hasher.hash('secret-password');
    expect(a).not.toBe(b);
    expect(await hasher.verify('secret-password', a)).toBe(true);
    expect(await hasher.verify('wrong', a)).toBe(false);
    expect(await hasher.verify('x', 'not-a-hash')).toBe(false);
  });
});

describe('loadConfig', () => {
  it('uses dev defaults outside production', () => {
    expect(loadConfig({})).toMatchObject({ port: 3000, dbPath: './flashcards.db' });
  });
  it('requires a strong JWT_SECRET in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET/);
    expect(() => loadConfig({ NODE_ENV: 'production', JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
    expect(loadConfig({ NODE_ENV: 'production', JWT_SECRET: SECRET }).jwtSecret).toBe(SECRET);
  });
  it('rejects an invalid port', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/PORT/);
  });
});

describe('SystemClock', () => {
  it('formats the date in the requested time zone as YYYY-MM-DD', () => {
    expect(new SystemClock().today('Pacific/Auckland')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
