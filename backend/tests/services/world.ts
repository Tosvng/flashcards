import { GAME_SCHEDULE } from '../../src/domain/gameSchedule.js';
import { addDays } from '../../src/domain/CycleCalendar.js';
import { LevelScheduler } from '../../src/domain/LevelScheduler.js';
import { LeitnerProgressionRule } from '../../src/domain/ReviewRules.js';
import { StrictAccentSpellingJudge } from '../../src/domain/SpellingJudge.js';
import { AuthService } from '../../src/services/AuthService.js';
import { DeckService } from '../../src/services/DeckService.js';
import { FlashcardService } from '../../src/services/FlashcardService.js';
import { NewCardIntroducer } from '../../src/services/NewCardIntroducer.js';
import { ReviewService } from '../../src/services/ReviewService.js';
import { SessionService } from '../../src/services/SessionService.js';
import { TodayResolver } from '../../src/services/TodayResolver.js';
import {
  FakeCardStateRepository, FakeFlashcardRepository, FakePasswordHasher, FakeReviewLogRepository,
  FakeSessionRepository, FakeSettingsRepository, FakeTokenService, FakeUserRepository,
  FixedClock, PassThroughUnitOfWork,
} from '../fakes/index.js';

export const START = '2026-01-01';

/** Wires the real services against in-memory fakes. */
export function buildWorld(cardCount = 0) {
  const clock = new FixedClock(START);
  const uow = new PassThroughUnitOfWork();
  const flashcards = new FakeFlashcardRepository();
  const cardStates = new FakeCardStateRepository(flashcards);
  const log = new FakeReviewLogRepository();
  const sessions = new FakeSessionRepository();
  const settings = new FakeSettingsRepository();
  const users = new FakeUserRepository();

  const todayResolver = new TodayResolver(settings, clock);
  const deck = new DeckService(sessions, cardStates, flashcards, todayResolver, clock);
  const session = new SessionService(
    sessions, cardStates, new LevelScheduler(GAME_SCHEDULE), new NewCardIntroducer(cardStates), deck, todayResolver, uow,
  );
  const review = new ReviewService(
    sessions, cardStates, flashcards, log, new StrictAccentSpellingJudge(), new LeitnerProgressionRule(),
    deck, todayResolver, clock, uow,
  );
  const auth = new AuthService(users, settings, new FakePasswordHasher(), new FakeTokenService(), clock, uow);
  const flashcardService = new FlashcardService(flashcards);

  for (let i = 1; i <= cardCount; i++) flashcards.addShared(`mot${i}`, `/mo${i}/`);
  settings.initialize(1, START, 'UTC');

  const world = {
    clock, flashcards, cardStates, log, sessions, settings, users, deck, session, review, auth, flashcardService,
    /** Moves the clock to cycle day N (1-based) of user's cycle. */
    goToDay(n: number) { clock.date = addDays(START, n - 1); },
    /** Answers the first card of the current deck. */
    answer(userId = 1, correct = true) {
      const card = deck.currentDeck(userId).cards[0]!;
      const word = flashcards.cards.find((c) => c.flashcardId === card.flashcardId)!.frenchText;
      return review.submit(userId, {
        flashcardId: card.flashcardId,
        spellingInput: correct ? word : `${word}x`,
        pronunciationCorrect: true,
      });
    },
    /** Passes every card until the session completes. */
    passAll(userId = 1) {
      let guard = 0;
      while (!deck.currentDeck(userId).sessionComplete) {
        world.answer(userId, true);
        if (++guard > 1000) throw new Error('runaway session');
      }
    },
    levelOf(userId: number, flashcardId: number) { return cardStates.get(userId, flashcardId)?.level; },
  };
  return world;
}
