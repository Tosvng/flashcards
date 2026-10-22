import { beforeEach, describe, expect, it } from 'vitest';
import { ConflictError } from '../../src/domain/errors.js';
import type { DailySession } from '../../src/domain/types.js';
import { openDatabase, runMigrations, type Db } from '../../src/infrastructure/sqlite/database.js';
import { SqliteCardStateRepository } from '../../src/infrastructure/sqlite/SqliteCardStateRepository.js';
import { SqliteFlashcardRepository } from '../../src/infrastructure/sqlite/SqliteFlashcardRepository.js';
import { SqliteReviewLogRepository } from '../../src/infrastructure/sqlite/SqliteReviewLogRepository.js';
import { SqliteSessionRepository } from '../../src/infrastructure/sqlite/SqliteSessionRepository.js';
import { SqliteSettingsRepository } from '../../src/infrastructure/sqlite/SqliteSettingsRepository.js';
import { SqliteUnitOfWork } from '../../src/infrastructure/sqlite/SqliteUnitOfWork.js';
import { SqliteUserRepository } from '../../src/infrastructure/sqlite/SqliteUserRepository.js';

let db: Db;
let users: SqliteUserRepository;
let flashcards: SqliteFlashcardRepository;
let states: SqliteCardStateRepository;
let u1: number;
let u2: number;

const card = (word: string) => ({
  frenchText: word, englishTranslation: word, photoUrl: 'u', description: 'd', phoneticSpelling: null,
});

function addShared(word: string, sortOrder: number) {
  db.prepare(
    `INSERT INTO flashcards (owner_user_id, sort_order, french_text, english_translation, photo_url, description)
     VALUES (NULL, ?, ?, ?, 'u', 'd')`,
  ).run(sortOrder, word, word);
}

beforeEach(() => {
  db = openDatabase(':memory:');
  users = new SqliteUserRepository(db);
  flashcards = new SqliteFlashcardRepository(db);
  states = new SqliteCardStateRepository(db);
  u1 = users.create('a@x.co', 'h');
  u2 = users.create('b@x.co', 'h');
});

describe('migrations', () => {
  it('are idempotent', () => {
    runMigrations(db);
    runMigrations(db);
    expect((db.prepare('SELECT COUNT(*) AS n FROM schema_version').get() as { n: number }).n).toBe(1);
  });
});

describe('SqliteUserRepository', () => {
  it('rejects duplicate emails with ConflictError', () => {
    expect(() => users.create('a@x.co', 'h')).toThrow(ConflictError);
  });
  it('finds users by email', () => {
    expect(users.findByEmail('a@x.co')?.userId).toBe(u1);
    expect(users.findByEmail('nope@x.co')).toBeNull();
  });
});

describe('SqliteFlashcardRepository', () => {
  it('scopes private cards to their owner', () => {
    addShared('shared', 1);
    const mine = flashcards.create(u1, card('mine'));
    expect(flashcards.findVisible(u1, mine.flashcardId)?.frenchText).toBe('mine');
    expect(flashcards.findVisible(u2, mine.flashcardId)).toBeNull();
    expect(flashcards.findManyVisible(u2, [1, mine.flashcardId]).map((c) => c.frenchText)).toEqual(['shared']);
    expect(flashcards.findManyVisible(u1, [])).toEqual([]);
  });

  it('lists and updates only the owner\'s cards', () => {
    addShared('shared', 1);
    const mine = flashcards.create(u1, card('mine'));
    expect(flashcards.findOwned(u1).map((c) => c.frenchText)).toEqual(['mine']);
    expect(flashcards.findOwned(u2)).toEqual([]);
    expect(flashcards.update(u1, mine.flashcardId, card('edited'))?.frenchText).toBe('edited');
    expect(flashcards.update(u2, mine.flashcardId, card('hacked'))).toBeNull();
    expect(flashcards.update(u1, 1, card('hacked'))).toBeNull();
    expect(flashcards.findVisible(u1, mine.flashcardId)?.frenchText).toBe('edited');
  });
});

describe('SqliteCardStateRepository', () => {
  beforeEach(() => {
    for (let i = 1; i <= 25; i++) addShared(`w${i}`, i);
  });

  it('introduces cards from the pool in sort order, limited, once', () => {
    expect(states.countInPool(u1)).toBe(25);
    expect(states.introduceFromPool(u1, 10, '2026-01-01')).toBe(10);
    const deck = states.listByLevel(u1, 1);
    expect(deck.map((s) => s.flashcardId)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(states.countInPool(u1)).toBe(15);
    expect(states.introduceFromPool(u1, 10, '2026-01-02')).toBe(10);
    expect(states.listByLevel(u1, 1).map((s) => s.flashcardId).slice(10)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(states.introduceFromPool(u1, 10, '2026-01-03')).toBe(5);
    expect(states.introduceFromPool(u1, 10, '2026-01-04')).toBe(0);
  });

  it('keeps users independent', () => {
    states.introduceFromPool(u1, 10, '2026-01-01');
    expect(states.countByLevel(u2, 1)).toBe(0);
    expect(states.countInPool(u2)).toBe(25);
    expect(states.introduceFromPool(u2, 3, '2026-01-01')).toBe(3);
    expect(states.listByLevel(u2, 1).map((s) => s.flashcardId)).toEqual([1, 2, 3]);
  });

  it('includes a user\'s private cards in their pool only', () => {
    flashcards.create(u1, card('private'));
    expect(states.countInPool(u1)).toBe(26);
    expect(states.countInPool(u2)).toBe(25);
  });

  it('saves levels and moves cards to the back', () => {
    states.introduceFromPool(u1, 3, '2026-01-01');
    states.moveToBack(u1, 1);
    expect(states.listByLevel(u1, 1).map((s) => s.flashcardId)).toEqual([2, 3, 1]);
    states.save(u1, 2, 3, '2026-01-02');
    expect(states.get(u1, 2)).toMatchObject({ level: 3, lastReviewedOn: '2026-01-02' });
    expect(states.countByLevel(u1, 3)).toBe(1);
    expect(states.get(u2, 2)).toBeNull();
  });

  it('places newly introduced cards after existing deck positions', () => {
    states.introduceFromPool(u1, 2, '2026-01-01');
    states.moveToBack(u1, 1);
    states.introduceFromPool(u1, 2, '2026-01-02');
    expect(states.listByLevel(u1, 1).map((s) => s.flashcardId)).toEqual([2, 1, 3, 4]);
  });
});

describe('SqliteSessionRepository', () => {
  const session: DailySession = {
    sessionDate: '2026-01-05', cycleDay: 5, levelsDue: [2, 1], isCatchUp: false, skipNewCards: true,
    newCardsAdded: 0, currentLevel: 2, status: 'in_progress', completedAt: null,
  };

  it('round-trips and updates', () => {
    const repo = new SqliteSessionRepository(db);
    repo.create(u1, session);
    expect(repo.findByDate(u1, '2026-01-05')).toEqual(session);
    repo.update(u1, { ...session, currentLevel: null, status: 'complete', completedAt: 't' });
    expect(repo.findByDate(u1, '2026-01-05')).toMatchObject({ status: 'complete', currentLevel: null, completedAt: 't' });
    expect(repo.findByDate(u2, '2026-01-05')).toBeNull();
  });

  it('finds the last complete session strictly before a date', () => {
    const repo = new SqliteSessionRepository(db);
    repo.create(u1, { ...session, sessionDate: '2026-01-03', status: 'complete' });
    repo.create(u1, { ...session, sessionDate: '2026-01-04', status: 'in_progress' });
    repo.create(u1, { ...session, sessionDate: '2026-01-05', status: 'complete' });
    expect(repo.findLastComplete(u1, '2026-01-05')?.sessionDate).toBe('2026-01-03');
    expect(repo.findLastComplete(u1, '2026-01-06')?.sessionDate).toBe('2026-01-05');
    expect(repo.findLastComplete(u2, '2026-01-06')).toBeNull();
  });
});

describe('SqliteSettingsRepository / ReviewLog / UnitOfWork', () => {
  it('stores settings per user', () => {
    const repo = new SqliteSettingsRepository(db);
    repo.initialize(u1, '2026-01-01', 'Europe/Paris');
    expect(repo.get(u1)).toEqual({ startDate: '2026-01-01', newCardsPerDay: 10, timeZone: 'Europe/Paris' });
    expect(repo.get(u2)).toBeNull();
  });

  it('appends review log rows', () => {
    addShared('w', 1);
    new SqliteReviewLogRepository(db).append(u1, {
      flashcardId: 1, sessionDate: '2026-01-01', cycleDay: 1, levelBefore: 1, levelAfter: 2,
      spellingCorrect: true, pronunciationCorrect: true, passed: true, attemptedAt: 't',
    });
    expect(db.prepare('SELECT user_id, passed FROM review_log').get()).toEqual({ user_id: u1, passed: 1 });
  });

  it('rolls back everything when the callback throws', () => {
    const uow = new SqliteUnitOfWork(db);
    expect(() =>
      uow.run(() => {
        users.create('c@x.co', 'h');
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(users.findByEmail('c@x.co')).toBeNull();
  });

  it('supports nested run() calls', () => {
    const uow = new SqliteUnitOfWork(db);
    const id = uow.run(() => uow.run(() => users.create('d@x.co', 'h')));
    expect(users.findByEmail('d@x.co')?.userId).toBe(id);
  });
});
