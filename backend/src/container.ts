import type { Config } from './config/env.js';
import { GAME_SCHEDULE } from './domain/gameSchedule.js';
import { LevelScheduler } from './domain/LevelScheduler.js';
import { LeitnerProgressionRule } from './domain/ReviewRules.js';
import { StrictAccentSpellingJudge } from './domain/SpellingJudge.js';
import { AuthController } from './http/controllers/AuthController.js';
import { DeckController } from './http/controllers/DeckController.js';
import { FlashcardController } from './http/controllers/FlashcardController.js';
import { ReviewController } from './http/controllers/ReviewController.js';
import { SessionController } from './http/controllers/SessionController.js';
import type { Controllers } from './http/routes.js';
import { Argon2PasswordHasher } from './infrastructure/Argon2PasswordHasher.js';
import { JwtTokenService } from './infrastructure/JwtTokenService.js';
import { openDatabase, type Db } from './infrastructure/sqlite/database.js';
import { SqliteCardStateRepository } from './infrastructure/sqlite/SqliteCardStateRepository.js';
import { SqliteFlashcardRepository } from './infrastructure/sqlite/SqliteFlashcardRepository.js';
import { SqliteReviewLogRepository } from './infrastructure/sqlite/SqliteReviewLogRepository.js';
import { SqliteSessionRepository } from './infrastructure/sqlite/SqliteSessionRepository.js';
import { SqliteSettingsRepository } from './infrastructure/sqlite/SqliteSettingsRepository.js';
import { SqliteUnitOfWork } from './infrastructure/sqlite/SqliteUnitOfWork.js';
import { SqliteUserRepository } from './infrastructure/sqlite/SqliteUserRepository.js';
import { SystemClock } from './infrastructure/SystemClock.js';
import type { Clock } from './ports/Clock.js';
import type { PasswordHasher } from './ports/PasswordHasher.js';
import type { TokenService } from './ports/TokenService.js';
import { AuthService } from './services/AuthService.js';
import { DeckService } from './services/DeckService.js';
import { FlashcardService } from './services/FlashcardService.js';
import { NewCardIntroducer } from './services/NewCardIntroducer.js';
import { ReviewService } from './services/ReviewService.js';
import { SessionService } from './services/SessionService.js';
import { TodayResolver } from './services/TodayResolver.js';

export interface Container {
  db: Db;
  controllers: Controllers;
  tokens: TokenService;
}

/** Test seams: swap the clock or password hasher without touching anything else. */
export interface Overrides {
  clock?: Clock;
  hasher?: PasswordHasher;
}

/** The only place concrete classes are constructed and wired together. */
export function buildContainer(config: Config, overrides: Overrides = {}): Container {
  const db = openDatabase(config.dbPath);
  const clock = overrides.clock ?? new SystemClock();
  const uow = new SqliteUnitOfWork(db);

  const users = new SqliteUserRepository(db);
  const settings = new SqliteSettingsRepository(db);
  const flashcards = new SqliteFlashcardRepository(db);
  const cardStates = new SqliteCardStateRepository(db);
  const reviewLog = new SqliteReviewLogRepository(db);
  const sessions = new SqliteSessionRepository(db);

  const tokens = new JwtTokenService(config.jwtSecret, config.jwtExpiresIn);
  const hasher = overrides.hasher ?? new Argon2PasswordHasher();

  const todayResolver = new TodayResolver(settings, clock);
  const deck = new DeckService(sessions, cardStates, flashcards, todayResolver, clock);
  const sessionService = new SessionService(
    sessions, cardStates, new LevelScheduler(GAME_SCHEDULE), new NewCardIntroducer(cardStates), deck, todayResolver, uow,
  );
  const reviewService = new ReviewService(
    sessions, cardStates, flashcards, reviewLog, new StrictAccentSpellingJudge(), new LeitnerProgressionRule(),
    deck, todayResolver, clock, uow,
  );

  return {
    db,
    tokens,
    controllers: {
      auth: new AuthController(new AuthService(users, settings, hasher, tokens, clock, uow)),
      session: new SessionController(sessionService),
      deck: new DeckController(deck),
      review: new ReviewController(reviewService),
      flashcard: new FlashcardController(new FlashcardService(flashcards)),
    },
  };
}
