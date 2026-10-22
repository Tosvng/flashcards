import { describe, expect, it, vi } from 'vitest';
/**
 * Opt-in contract test: drives the real data layer against a running backend.
 *   cd backend && DB_PATH=/tmp/it.db PORT=3999 pnpm dev      (fresh DB)
 *   cd web     && INTEGRATION_API_URL=http://localhost:3999 pnpm test:integration
 * Skipped unless INTEGRATION_API_URL is set.
 */
import { composeServices } from '../../src/app/composition';
import { InMemoryTokenStorage } from '../../src/data/storage/InMemoryTokenStorage';
import { ApiError } from '../../src/domain/errors';

const baseUrl = process.env.INTEGRATION_API_URL;
const suite = baseUrl ? describe : describe.skip;

suite('mobile data layer ↔ real backend', () => {
  const tokens = new InMemoryTokenStorage();
  const services = composeServices({ baseUrl: baseUrl!, tokens });
  const email = `it-${Date.now()}@example.com`;
  // The description must not contain the word, or the "answer is not in the deck" check below is meaningless.
  const card = (frenchText: string, description: string, phoneticSpelling: string | null) => ({
    frenchText, englishTranslation: `translation of ${description}`, photoUrl: 'https://img.example/x.png', description, phoneticSpelling,
  });

  it('rejects unauthenticated calls, without signalling a session expiry', async () => {
    const expired = vi.fn();
    services.sessionExpired.subscribe(expired);
    await expect(services.deck.current()).rejects.toMatchObject({ status: 401 });
    expect(expired).not.toHaveBeenCalled(); // no token was sent
  });

  it('registers, rejects a duplicate, and logs in', async () => {
    const reg = await services.auth.register(email, 'password123', 'Europe/Paris');
    expect(reg.token).toBeTruthy();
    await tokens.set(reg.token);
    await expect(services.auth.register(email, 'password123', 'UTC')).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(services.auth.login(email, 'wrongpassword')).rejects.toBeInstanceOf(ApiError);
    expect((await services.auth.login(email, 'password123')).userId).toBe(reg.userId);
  });

  it('runs a whole review session end to end', async () => {
    const added = await services.flashcards.add(card('été', 'a season', '/ete/'));
    await services.flashcards.add(card('chat', 'a small pet', null));
    expect(added.frenchText).toBe('été');

    const preview = await services.session.today();
    expect(preview).toMatchObject({ started: false, status: 'not_started', cycleDay: 1, levelsDue: [2, 1], newCardsAdded: 2 });

    const started = await services.session.start(false);
    expect(started).toMatchObject({ started: true, status: 'in_progress', currentLevel: 1, newCardsAdded: 2 });

    let deck = await services.deck.current();
    expect(deck).toMatchObject({ sessionComplete: false, level: 1 });
    expect(deck.cards).toHaveLength(2);
    expect(JSON.stringify(deck)).not.toContain('chat'); // the answer is not in the deck

    // First card fails on spelling: reveal tells us why, submit re-queues it.
    const first = deck.cards[0]!;
    const word = first.letterCount === 3 ? 'été' : 'chat';
    const revealed = await services.review.reveal({ flashcardId: first.flashcardId, spellingInput: 'zzz' });
    expect(revealed).toMatchObject({ spellingCorrect: false, correctSpelling: word });
    const failed = await services.review.submit({ flashcardId: first.flashcardId, spellingInput: 'zzz', pronunciationCorrect: true });
    expect(failed).toMatchObject({ passed: false, newLevel: 1, sessionComplete: false });

    // Now pass every remaining card until the server says the session is complete.
    for (let guard = 0; guard < 10; guard++) {
      deck = await services.deck.current();
      if (deck.sessionComplete) break;
      const c = deck.cards[0]!;
      const w = c.letterCount === 3 ? 'ÉTÉ' : 'chat'; // case is ignored, accents are not
      const result = await services.review.submit({ flashcardId: c.flashcardId, spellingInput: ` ${w} `, pronunciationCorrect: true });
      expect(result.passed).toBe(true);
      expect(result.newLevel).toBe(2);
    }
    expect(deck.sessionComplete).toBe(true);
    expect(await services.session.today()).toMatchObject({ status: 'complete', currentLevel: null });
  });

  it('signals session expiry when the token is rejected', async () => {
    const expired = vi.fn();
    services.sessionExpired.subscribe(expired);
    await tokens.set('not-a-valid-token');
    await expect(services.session.today()).rejects.toMatchObject({ status: 401 });
    expect(expired).toHaveBeenCalledTimes(1);
  });
});
