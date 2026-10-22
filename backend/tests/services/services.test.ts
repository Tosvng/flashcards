import { describe, expect, it } from 'vitest';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '../../src/domain/errors.js';
import { buildWorld } from './world.js';

describe('daily session: days 1-3 walkthrough', () => {
  it('follows the Leitner game steps from the product notes', () => {
    const w = buildWorld(30);

    // Day 1: levels 2,1 due. L2 empty -> skipped. 10 new cards enter L1.
    w.goToDay(1);
    const d1 = w.session.start(1, false);
    expect(d1).toMatchObject({ cycleDay: 1, levelsDue: [2, 1], newCardsAdded: 10, currentLevel: 1, isCatchUp: false });
    w.passAll();
    expect(w.cardStates.countByLevel(1, 2)).toBe(10);
    expect(w.cardStates.countByLevel(1, 1)).toBe(0);

    // Day 2: levels 3,1 due. L3 empty. 10 new -> pass -> L2 has 20.
    w.goToDay(2);
    expect(w.session.start(1, false)).toMatchObject({ cycleDay: 2, levelsDue: [3, 1], currentLevel: 1 });
    w.passAll();
    expect(w.cardStates.countByLevel(1, 2)).toBe(20);

    // Day 3: levels 2,1. Fail one L2 card; the rest go to L3.
    w.goToDay(3);
    expect(w.session.start(1, false)).toMatchObject({ cycleDay: 3, levelsDue: [2, 1], currentLevel: 2 });
    const failed = w.deck.currentDeck(1).cards[0]!.flashcardId;
    w.answer(1, false);
    expect(w.levelOf(1, failed)).toBe(1);
    for (let i = 0; i < 19; i++) w.answer(1, true);
    expect(w.cardStates.countByLevel(1, 3)).toBe(19);

    // Now on L1: demoted card + 10 new cards, demoted card at the back.
    const deck = w.deck.currentDeck(1);
    expect(deck.level).toBe(1);
    expect(deck.cards).toHaveLength(11);
    expect(deck.cards.at(-1)!.flashcardId).toBe(failed);
    w.passAll();
    expect(w.session.preview(1).status).toBe('complete');
  });
});

describe('session start', () => {
  it('is idempotent: new cards are added once per day', () => {
    const w = buildWorld(30);
    const first = w.session.start(1, false);
    const second = w.session.start(1, false);
    expect(first.newCardsAdded).toBe(10);
    expect(second.newCardsAdded).toBe(10);
    expect(w.cardStates.countByLevel(1, 1)).toBe(10);
  });

  it('skips new cards when asked', () => {
    const w = buildWorld(30);
    const s = w.session.start(1, true);
    expect(s.newCardsAdded).toBe(0);
    expect(s.skipNewCards).toBe(true);
    expect(s.status).toBe('complete'); // nothing to review
  });

  it('preview never mutates anything', () => {
    const w = buildWorld(30);
    const p = w.session.preview(1);
    expect(p).toMatchObject({ started: false, status: 'not_started', newCardsAdded: 10, levelsDue: [2, 1] });
    // Level 2 is empty, so the preview points at Level 1 (where the new cards will land), like a started session.
    expect(p.currentLevel).toBe(1);
    expect(buildWorld(0).session.preview(1).currentLevel).toBeNull();
    expect(w.cardStates.countByLevel(1, 1)).toBe(0);
    expect(w.sessions.findByDate(1, p.sessionDate)).toBeNull();
  });

  it('adds fewer than 10 when the pool is nearly empty', () => {
    const w = buildWorld(4);
    expect(w.session.start(1, false).newCardsAdded).toBe(4);
  });

  it('completes immediately when there is nothing to review', () => {
    const w = buildWorld(0);
    expect(w.session.start(1, false).status).toBe('complete');
  });

  it('builds a catch-up session after missed days (57+58 missed, today 59 -> 6,3,2,1)', () => {
    const w = buildWorld(0);
    w.goToDay(56);
    w.sessions.create(1, {
      sessionDate: w.clock.date, cycleDay: 56, levelsDue: [7, 1], isCatchUp: false, skipNewCards: false,
      newCardsAdded: 0, currentLevel: null, status: 'complete', completedAt: 'x',
    });
    w.goToDay(59);
    expect(w.session.preview(1)).toMatchObject({ levelsDue: [6, 3, 2, 1], isCatchUp: true, cycleDay: 59 });
  });

  it('does not back-fill new cards for missed days', () => {
    const w = buildWorld(100);
    w.goToDay(1);
    w.session.start(1, false);
    w.passAll();
    w.goToDay(5); // missed days 2-4
    expect(w.session.start(1, false).newCardsAdded).toBe(10);
  });
});

describe('review rules through the service', () => {
  it('re-serves a failed Level 1 card until it passes', () => {
    const w = buildWorld(10);
    w.session.start(1, false);
    const first = w.deck.currentDeck(1).cards[0]!.flashcardId;
    const r = w.answer(1, false);
    expect(r).toMatchObject({ passed: false, newLevel: 1, sessionComplete: false });
    expect(w.deck.currentDeck(1).cards.at(-1)!.flashcardId).toBe(first);
    w.passAll();
    expect(w.session.preview(1).status).toBe('complete');
  });

  it('fails on missing pronunciation even if spelling is right', () => {
    const w = buildWorld(10);
    w.session.start(1, false);
    const card = w.deck.currentDeck(1).cards[0]!;
    const word = w.flashcards.cards.find((c) => c.flashcardId === card.flashcardId)!.frenchText;
    const r = w.review.submit(1, { flashcardId: card.flashcardId, spellingInput: word, pronunciationCorrect: false });
    expect(r).toMatchObject({ spellingCorrect: true, passed: false, phoneticSpelling: expect.any(String) });
  });

  it('sends a failed Level 4 card to Level 1 and re-reviews it the same session', () => {
    const w = buildWorld(2);
    w.cardStates.place(1, 1, 4);
    w.goToDay(4); // day 4 = levels 4,1
    expect(w.session.start(1, true)).toMatchObject({ levelsDue: [4, 1], currentLevel: 4 });
    w.answer(1, false);
    expect(w.deck.currentDeck(1)).toMatchObject({ level: 1, sessionComplete: false });
    w.passAll();
    expect(w.levelOf(1, 1)).toBe(2);
  });

  it('completes a card after passing Level 7 and never serves it again', () => {
    const w = buildWorld(1);
    w.cardStates.place(1, 1, 7);
    w.goToDay(56); // levels 7,1
    w.session.start(1, true);
    const r = w.answer(1, true);
    expect(r.newLevel).toBe(8);
    expect(w.session.preview(1).status).toBe('complete');
    expect(w.cardStates.listByLevel(1, 1)).toHaveLength(0);
  });

  it('logs every attempt', () => {
    const w = buildWorld(3);
    w.session.start(1, false);
    w.answer(1, false);
    w.answer(1, true);
    expect(w.log.entries).toHaveLength(2);
    expect(w.log.entries[0]!.userId).toBe(1);
    expect(w.log.entries[0]!.entry).toMatchObject({ passed: false, levelBefore: 1, levelAfter: 1 });
    expect(w.log.entries[1]!.entry).toMatchObject({ passed: true, levelBefore: 1, levelAfter: 2 });
  });

  it('reveal judges spelling and returns the answer without changing any state', () => {
    const w = buildWorld(3);
    w.session.start(1, false);
    const before = JSON.stringify(w.cardStates.listByLevel(1, 1));
    expect(w.review.reveal(1, { flashcardId: 1, spellingInput: ' MOT1 ' })).toEqual({
      spellingCorrect: true, correctSpelling: 'mot1', phoneticSpelling: '/mo1/',
    });
    expect(w.review.reveal(1, { flashcardId: 1, spellingInput: 'mot' }).spellingCorrect).toBe(false);
    expect(JSON.stringify(w.cardStates.listByLevel(1, 1))).toBe(before);
    expect(w.log.entries).toHaveLength(0);
  });

  it('reveal is guarded like submit (no session, wrong level, other user, complete)', () => {
    const w = buildWorld(3);
    w.settings.initialize(2, '2026-01-01', 'UTC');
    expect(() => w.review.reveal(1, { flashcardId: 1, spellingInput: 'x' })).toThrow(NotFoundError);
    w.session.start(1, false);
    w.cardStates.place(1, 3, 5);
    expect(() => w.review.reveal(1, { flashcardId: 3, spellingInput: 'x' })).toThrow(ValidationError);
    w.session.start(2, false);
    expect(() => w.review.reveal(2, { flashcardId: 1, spellingInput: 'x' })).not.toThrow(); // shared card, own state
    w.passAll(1);
    expect(() => w.review.reveal(1, { flashcardId: 1, spellingInput: 'x' })).toThrow(ValidationError);
  });

  it('rejects reviewing a card outside the current level or before starting', () => {
    const w = buildWorld(3);
    expect(() => w.review.submit(1, { flashcardId: 1, spellingInput: 'x', pronunciationCorrect: true })).toThrow(NotFoundError);
    w.session.start(1, false);
    w.cardStates.place(1, 3, 5);
    expect(() => w.review.submit(1, { flashcardId: 3, spellingInput: 'x', pronunciationCorrect: true })).toThrow(ValidationError);
  });

  it('rejects reviews after the session is complete', () => {
    const w = buildWorld(2);
    w.session.start(1, false);
    w.passAll();
    expect(() => w.review.submit(1, { flashcardId: 1, spellingInput: 'x', pronunciationCorrect: true })).toThrow(ValidationError);
  });

  it('resumes an interrupted session where it left off', () => {
    const w = buildWorld(10);
    w.session.start(1, false);
    w.answer(1, true);
    w.answer(1, true);
    const resumed = w.session.start(1, false);
    expect(resumed.currentLevel).toBe(1);
    expect(w.deck.currentDeck(1).cards).toHaveLength(8);
  });

  it('hides the French word but exposes the letter count', () => {
    const w = buildWorld(1);
    w.session.start(1, false);
    const card = w.deck.currentDeck(1).cards[0]!;
    expect(card).toEqual({ flashcardId: 1, photoUrl: '/img/mot1.png', description: 'desc mot1', letterCount: 4 });
  });
});

describe('multi-user isolation', () => {
  it('keeps levels, sessions and logs independent per user', () => {
    const w = buildWorld(20);
    w.settings.initialize(2, '2026-01-01', 'UTC');
    w.session.start(1, false);
    w.passAll(1);
    expect(w.cardStates.countByLevel(1, 2)).toBe(10);
    expect(w.cardStates.countByLevel(2, 2)).toBe(0);
    expect(w.session.preview(2)).toMatchObject({ started: false, newCardsAdded: 10 });
    expect(() => w.deck.currentDeck(2)).toThrow(NotFoundError);
  });

  it("hides one user's private card from another", () => {
    const w = buildWorld(0);
    w.settings.initialize(2, '2026-01-01', 'UTC');
    const mine = w.flashcardService.add(1, {
      frenchText: 'secret', englishTranslation: 's', photoUrl: 'u', description: 'd', phoneticSpelling: null,
    });
    expect(w.flashcardService.get(1, mine.flashcardId).frenchText).toBe('secret');
    expect(() => w.flashcardService.get(2, mine.flashcardId)).toThrow(NotFoundError);
    expect(w.session.start(2, false).newCardsAdded).toBe(0);
    expect(w.session.start(1, false).newCardsAdded).toBe(1);
  });

  it('shares library cards with every user', () => {
    const w = buildWorld(3);
    w.settings.initialize(2, '2026-01-01', 'UTC');
    expect(w.flashcardService.get(2, 1).frenchText).toBe('mot1');
  });
});

describe('AuthService', () => {
  it('registers, initializes settings, and logs in', async () => {
    const w = buildWorld(0);
    const reg = await w.auth.register('A@Example.com ', 'pw', 'Europe/Paris');
    expect(w.settings.get(reg.userId)).toMatchObject({ newCardsPerDay: 10, timeZone: 'Europe/Paris' });
    const login = await w.auth.login('a@example.com', 'pw');
    expect(login.userId).toBe(reg.userId);
  });

  it('rejects duplicate emails', async () => {
    const w = buildWorld(0);
    await w.auth.register('a@b.co', 'pw');
    await expect(w.auth.register('A@B.co', 'pw')).rejects.toThrow(ConflictError);
  });

  it('gives the same error for unknown email and wrong password', async () => {
    const w = buildWorld(0);
    await w.auth.register('a@b.co', 'pw');
    await expect(w.auth.login('a@b.co', 'bad')).rejects.toThrow(UnauthorizedError);
    await expect(w.auth.login('nobody@b.co', 'pw')).rejects.toThrow(UnauthorizedError);
    await expect(w.auth.login('a@b.co', 'bad')).rejects.toThrow('Invalid email or password');
    await expect(w.auth.login('nobody@b.co', 'pw')).rejects.toThrow('Invalid email or password');
  });
});
