import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config/env.js';
import { buildContainer } from '../../src/container.js';
import { FakePasswordHasher, FixedClock } from '../fakes/index.js';

let clock: FixedClock;
let app: ReturnType<typeof createApp>;
let db: ReturnType<typeof buildContainer>['db'];

beforeEach(() => {
  clock = new FixedClock('2026-01-01');
  const container = buildContainer(loadConfig({ DB_PATH: ':memory:' }), { clock, hasher: new FakePasswordHasher() });
  db = container.db;
  app = createApp(container.controllers, container.tokens);
  for (let i = 1; i <= 12; i++) {
    db.prepare(
      `INSERT INTO flashcards (owner_user_id, sort_order, french_text, english_translation, photo_url, description, phonetic_spelling)
       VALUES (NULL, ?, ?, ?, ?, ?, ?)`,
    ).run(i, `mot${i}`, `word${i}`, `https://img/${i}.png`, `description ${i}`, `/mo${i}/`);
  }
});

async function register(email = 'a@example.com') {
  const res = await request(app).post('/api/auth/register').send({ email, password: 'password123' });
  expect(res.status).toBe(201);
  return res.body.token as string;
}
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Answers every card in the current deck correctly (spelling comes from the DB, as a real user would know it). */
async function passDeck(token: string) {
  for (let guard = 0; guard < 100; guard++) {
    const deck = (await request(app).get('/api/decks/daily').set(auth(token))).body;
    if (deck.sessionComplete) return;
    const card = deck.cards[0];
    const { french_text } = db.prepare('SELECT french_text FROM flashcards WHERE flashcard_id = ?').get(card.flashcardId) as { french_text: string };
    const res = await request(app)
      .post('/api/review').set(auth(token))
      .send({ flashcardId: card.flashcardId, spellingInput: french_text, pronunciationCorrect: true });
    expect(res.status).toBe(200);
  }
  throw new Error('runaway');
}

describe('basics', () => {
  it('serves /health without auth', async () => {
    expect((await request(app).get('/health')).body).toEqual({ status: 'ok' });
  });
  it('returns 404 JSON for unknown routes', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
  it('returns 400 for malformed JSON', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
  });
});

describe('auth', () => {
  it('rejects missing, malformed and invalid tokens with 401', async () => {
    for (const path of ['/api/session/today', '/api/decks/daily']) {
      expect((await request(app).get(path)).status).toBe(401);
      expect((await request(app).get(path).set('Authorization', 'Token abc')).status).toBe(401);
      expect((await request(app).get(path).set('Authorization', 'Bearer garbage')).status).toBe(401);
    }
    expect((await request(app).post('/api/review').send({})).status).toBe(401);
  });

  it('validates registration input', async () => {
    const bad = [
      { email: 'not-an-email', password: 'password123' },
      { email: 'a@b.co', password: 'short' },
      { email: 'a@b.co', password: 'password123', timeZone: 'Mars/Olympus' },
      {},
    ];
    for (const body of bad) expect((await request(app).post('/api/auth/register').send(body)).status).toBe(400);
  });

  it('rejects duplicate registration (409) and wrong passwords (401)', async () => {
    await register('dup@example.com');
    expect((await request(app).post('/api/auth/register').send({ email: 'DUP@example.com', password: 'password123' })).status).toBe(409);
    expect((await request(app).post('/api/auth/login').send({ email: 'dup@example.com', password: 'wrongpass' })).status).toBe(401);
    const ok = await request(app).post('/api/auth/login').send({ email: 'dup@example.com', password: 'password123' });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
  });
});

describe('daily session flow', () => {
  it('previews without mutating, then starts, reviews and completes a day', async () => {
    const token = await register();

    const preview = await request(app).get('/api/session/today').set(auth(token));
    expect(preview.body).toMatchObject({ started: false, status: 'not_started', cycleDay: 1, levelsDue: [2, 1], newCardsAdded: 10 });
    expect((await request(app).get('/api/decks/daily').set(auth(token))).status).toBe(404);

    const start = await request(app).post('/api/session/start').set(auth(token)).send({});
    expect(start.body).toMatchObject({ started: true, status: 'in_progress', newCardsAdded: 10, currentLevel: 1 });

    const deck = (await request(app).get('/api/decks/daily').set(auth(token))).body;
    expect(deck.cards).toHaveLength(10);
    expect(deck.cards[0]).toEqual({ flashcardId: 1, photoUrl: 'https://img/1.png', description: 'description 1', letterCount: 4 });
    expect(JSON.stringify(deck)).not.toContain('mot1'); // the answer is never sent

    // Wrong spelling: fails, card stays at level 1 and goes to the back.
    const wrong = await request(app).post('/api/review').set(auth(token)).send({ flashcardId: 1, spellingInput: 'mot', pronunciationCorrect: true });
    expect(wrong.body).toMatchObject({ passed: false, spellingCorrect: false, correctSpelling: 'mot1', phoneticSpelling: '/mo1/', newLevel: 1 });
    expect((await request(app).get('/api/decks/daily').set(auth(token))).body.cards.at(-1).flashcardId).toBe(1);

    // Reveal: judges spelling and returns the answer + phonetics, but does not change anything.
    const reveal = await request(app).post('/api/review/reveal').set(auth(token)).send({ flashcardId: 3, spellingInput: 'mot3' });
    expect(reveal.body).toEqual({ spellingCorrect: true, correctSpelling: 'mot3', phoneticSpelling: '/mo3/' });
    expect((await request(app).get('/api/decks/daily').set(auth(token))).body.cards.map((c: { flashcardId: number }) => c.flashcardId)).toContain(3);
    expect((await request(app).post('/api/review/reveal').send({ flashcardId: 3, spellingInput: 'x' })).status).toBe(401);
    expect((await request(app).post('/api/review/reveal').set(auth(token)).send({ flashcardId: 3 })).status).toBe(400);

    // Right spelling but pronunciation wrong: still fails.
    const noPron = await request(app).post('/api/review').set(auth(token)).send({ flashcardId: 2, spellingInput: 'MOT2', pronunciationCorrect: false });
    expect(noPron.body).toMatchObject({ passed: false, spellingCorrect: true });

    await passDeck(token);
    const done = await request(app).get('/api/session/today').set(auth(token));
    expect(done.body).toMatchObject({ status: 'complete', currentLevel: null });
    expect((await request(app).get('/api/decks/daily').set(auth(token))).body).toEqual({ sessionComplete: true, level: null, cards: [] });

    // Reviewing after completion is rejected.
    expect((await request(app).post('/api/review').set(auth(token)).send({ flashcardId: 1, spellingInput: 'mot1', pronunciationCorrect: true })).status).toBe(400);
  });

  it('is idempotent: starting twice adds new cards once', async () => {
    const token = await register();
    await request(app).post('/api/session/start').set(auth(token)).send({});
    const again = await request(app).post('/api/session/start').set(auth(token)).send({ skipNewCards: true });
    expect(again.body.newCardsAdded).toBe(10);
    expect(again.body.skipNewCards).toBe(false);
    expect((db.prepare('SELECT COUNT(*) AS n FROM card_state').get() as { n: number }).n).toBe(10);
  });

  it('skips new cards on request', async () => {
    const token = await register();
    const res = await request(app).post('/api/session/start').set(auth(token)).send({ skipNewCards: true });
    expect(res.body).toMatchObject({ newCardsAdded: 0, skipNewCards: true, status: 'complete' });
  });

  it('runs days 1-3 and builds a catch-up session after a gap', async () => {
    const token = await register();
    for (const date of ['2026-01-01', '2026-01-02']) {
      clock.date = date;
      await request(app).post('/api/session/start').set(auth(token)).send({});
      await passDeck(token);
    }
    // Day 3 (2026-01-03): level 2 due, then level 1.
    clock.date = '2026-01-03';
    const d3 = await request(app).post('/api/session/start').set(auth(token)).send({});
    expect(d3.body).toMatchObject({ cycleDay: 3, levelsDue: [2, 1], currentLevel: 2, newCardsAdded: 0 }); // 12 cards: 10 on day 1, last 2 on day 2, pool now empty
    await passDeck(token);

    // Skip days 4-5, return on day 6: days 4,5,6 = (4,1),(2,1),(3,1) -> [4,3,2,1].
    clock.date = '2026-01-06';
    const catchUp = await request(app).get('/api/session/today').set(auth(token));
    expect(catchUp.body).toMatchObject({ cycleDay: 6, levelsDue: [4, 3, 2, 1], isCatchUp: true });
  });
});

describe('flashcards & isolation', () => {
  const body = { frenchText: 'chat', englishTranslation: 'cat', photoUrl: 'https://img/cat.png', description: 'a small pet' };

  it('creates private cards, validates input, and hides them from other users', async () => {
    const a = await register('a@example.com');
    const b = await register('b@example.com');

    const created = await request(app).post('/api/flashcards').set(auth(a)).send(body);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ frenchText: 'chat', phoneticSpelling: null });
    const id = created.body.flashcardId;

    expect((await request(app).get(`/api/flashcards/${id}`).set(auth(a))).status).toBe(200);
    expect((await request(app).get(`/api/flashcards/${id}`).set(auth(b))).status).toBe(404);
    expect((await request(app).get('/api/flashcards/1').set(auth(b))).status).toBe(200); // shared library card
    expect((await request(app).get('/api/flashcards/abc').set(auth(a))).status).toBe(400);
    expect((await request(app).post('/api/flashcards').set(auth(a)).send({ ...body, photoUrl: 'nope' })).status).toBe(400);
    expect((await request(app).post('/api/flashcards').set(auth(a)).send({ ...body, frenchText: '  ' })).status).toBe(400);
  });

  it("keeps each user's progress separate and cannot review another user's card", async () => {
    const a = await register('a@example.com');
    const b = await register('b@example.com');
    await request(app).post('/api/session/start').set(auth(a)).send({});
    await passDeck(a);

    expect((await request(app).get('/api/session/today').set(auth(b))).body).toMatchObject({ started: false });
    await request(app).post('/api/session/start').set(auth(b)).send({});
    // B has card 1 at level 1 independently of A (who has moved it to level 2).
    const deckB = (await request(app).get('/api/decks/daily').set(auth(b))).body;
    expect(deckB.cards).toHaveLength(10);

    // A private card of A is not reviewable by B even if B guesses the id.
    const priv = (await request(app).post('/api/flashcards').set(auth(a)).send(body)).body.flashcardId;
    const res = await request(app).post('/api/review').set(auth(b)).send({ flashcardId: priv, spellingInput: 'chat', pronunciationCorrect: true });
    expect(res.status).toBe(404);
  });

  it('validates review bodies', async () => {
    const token = await register();
    await request(app).post('/api/session/start').set(auth(token)).send({});
    for (const bad of [{}, { flashcardId: 'x', spellingInput: 'a', pronunciationCorrect: true }, { flashcardId: 1, spellingInput: 'a' }]) {
      expect((await request(app).post('/api/review').set(auth(token)).send(bad)).status).toBe(400);
    }
    // Card that exists but is not in the level being reviewed -> 400/404, never 500.
    const unknown = await request(app).post('/api/review').set(auth(token)).send({ flashcardId: 11, spellingInput: 'a', pronunciationCorrect: true });
    expect(unknown.status).toBe(404);
  });
});

describe('editing words', () => {
  const body = { frenchText: 'chat', englishTranslation: 'cat', photoUrl: 'https://img/cat.png', description: 'a pet that purrs' };

  it('lists and edits the user\'s own words', async () => {
    const token = await register();
    const created = (await request(app).post('/api/flashcards').set(auth(token)).send(body)).body;
    const list = await request(app).get('/api/flashcards').set(auth(token));
    expect(list.body.map((c: { frenchText: string }) => c.frenchText)).toEqual(['chat']);

    const res = await request(app).put(`/api/flashcards/${created.flashcardId}`).set(auth(token)).send({ ...body, frenchText: 'chaton' });
    expect(res.status).toBe(200);
    expect(res.body.frenchText).toBe('chaton');
    expect((await request(app).get(`/api/flashcards/${created.flashcardId}`).set(auth(token))).body.frenchText).toBe('chaton');
  });

  it('deletes a word, and only the owner can', async () => {
    const token = await register();
    const other = await register('b@example.com');
    const created = (await request(app).post('/api/flashcards').set(auth(token)).send(body)).body;
    expect((await request(app).delete(`/api/flashcards/${created.flashcardId}`).set(auth(other))).status).toBe(404);
    expect((await request(app).delete(`/api/flashcards/${created.flashcardId}`)).status).toBe(401);
    expect((await request(app).delete(`/api/flashcards/${created.flashcardId}`).set(auth(token))).status).toBe(204);
    expect((await request(app).get('/api/flashcards').set(auth(token))).body).toEqual([]);
    expect((await request(app).delete(`/api/flashcards/${created.flashcardId}`).set(auth(token))).status).toBe(404);
    expect((await request(app).delete('/api/flashcards/1').set(auth(token))).status).toBe(404);
  });

  it('hides other users\' and shared words, and validates input', async () => {
    const owner = await register();
    const other = await register('b@example.com');
    const created = (await request(app).post('/api/flashcards').set(auth(owner)).send(body)).body;
    expect((await request(app).put(`/api/flashcards/${created.flashcardId}`).set(auth(other)).send(body)).status).toBe(404);
    expect((await request(app).put('/api/flashcards/1').set(auth(owner)).send(body)).status).toBe(404);
    expect((await request(app).put(`/api/flashcards/${created.flashcardId}`).set(auth(owner)).send({ ...body, frenchText: ' ' })).status).toBe(400);
    expect((await request(app).put(`/api/flashcards/${created.flashcardId}`).send(body)).status).toBe(401);
    expect((await request(app).get('/api/flashcards').set(auth(other))).body).toEqual([]);
  });
});
