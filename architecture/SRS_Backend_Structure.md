# Backend Code Structure (Node.js + TypeScript + SQLite)

This document is the code-level companion to `SRS_Backend_Notes.md` (schema, endpoints, engine rules) and `SRS_App_Notes.md` (product behaviour). It defines the folder layout, the classes/functions to write, what each one does, and an approximate line count. Line counts are rough targets for planning (code only, excluding blank lines and comments, ±30%).

**Stack assumptions:** Express, TypeScript, `better-sqlite3` (synchronous, transaction-friendly), `zod` for request validation, `argon2` for password hashing, `jsonwebtoken` for tokens, `vitest` for tests.

**Multi-user:** every user-owned record carries a `user_id`. The id comes only from the authenticated request (`req.userId`, set by `authenticate` middleware) and is passed explicitly as the first argument of every service and repository method. No repository method touches user data without it.

---

## 1. Design Principles (SOLID applied)

| Principle | How it is applied here |
| :--- | :--- |
| **S**ingle Responsibility | Each file does one thing: `LevelScheduler` only decides *which levels are due*; `ReviewRules` only decides *where a card moves*; `SpellingJudge` only compares strings; repositories only talk to SQLite; controllers only translate HTTP ↔ services. |
| **O**pen/Closed | Spelling comparison, level-movement rules and the schedule are behind small interfaces/data. Changing accent strictness, adding a "graduate to Completed" variant, or swapping the 64-day table means adding/replacing one implementation, not editing services. |
| **L**iskov Substitution | Every repository has an interface with an SQLite implementation and an in-memory fake used in tests. Both must be interchangeable without services noticing. |
| **I**nterface Segregation | Small, role-specific repository interfaces (`CardStateRepository`, `SessionRepository`, …) instead of one giant `Database` interface. Services depend only on the methods they use. |
| **D**ependency Inversion | Domain and services depend on interfaces (`ports`), never on `better-sqlite3`, Express or `Date.now()`. Concrete classes are wired in exactly one place: `container.ts` (the composition root). A `Clock` interface replaces direct date access. |

**Dependency direction (arrows = "depends on"):**

```
http (controllers)  →  services  →  domain (pure rules)  ←  repositories (interfaces)
                                                                    ▲
                                              infrastructure/sqlite (implementations)
```

`domain/` imports nothing from any other layer. `infrastructure/` is the only layer that knows about SQLite.

---

## 2. Folder Structure

```
backend/
├── package.json
├── tsconfig.json
├── src/
│   ├── server.ts                        # process entry point
│   ├── app.ts                           # builds the Express app
│   ├── container.ts                     # composition root (all wiring)
│   ├── config/
│   │   └── env.ts                       # typed environment config
│   ├── domain/                          # pure business rules, no I/O
│   │   ├── types.ts
│   │   ├── gameSchedule.ts
│   │   ├── CycleCalendar.ts
│   │   ├── LevelScheduler.ts
│   │   ├── ReviewRules.ts
│   │   ├── SpellingJudge.ts
│   │   └── errors.ts
│   ├── ports/                           # interfaces the domain/services depend on
│   │   ├── Clock.ts
│   │   ├── FlashcardRepository.ts
│   │   ├── CardStateRepository.ts
│   │   ├── ReviewLogRepository.ts
│   │   ├── SessionRepository.ts
│   │   ├── SettingsRepository.ts
│   │   ├── UserRepository.ts
│   │   ├── PasswordHasher.ts
│   │   ├── TokenService.ts
│   │   └── UnitOfWork.ts
│   ├── services/                        # use-case orchestration
│   │   ├── SessionService.ts
│   │   ├── NewCardIntroducer.ts
│   │   ├── TodayResolver.ts
│   │   ├── DeckService.ts
│   │   ├── ReviewService.ts
│   │   ├── FlashcardService.ts
│   │   └── AuthService.ts
│   ├── infrastructure/
│   │   ├── SystemClock.ts
│   │   ├── Argon2PasswordHasher.ts
│   │   ├── JwtTokenService.ts
│   │   └── sqlite/
│   │       ├── database.ts
│   │       ├── SqliteUnitOfWork.ts
│   │       ├── SqliteFlashcardRepository.ts
│   │       ├── SqliteCardStateRepository.ts
│   │       ├── SqliteReviewLogRepository.ts
│   │       ├── SqliteSessionRepository.ts
│   │       ├── SqliteSettingsRepository.ts
│   │       ├── SqliteUserRepository.ts
│   │       └── migrations.ts          # schema as embedded SQL strings
│   └── http/
│       ├── routes.ts
│       ├── controllers/
│       │   ├── SessionController.ts
│       │   ├── AuthController.ts
│       │   ├── DeckController.ts
│       │   ├── ReviewController.ts
│       │   └── FlashcardController.ts
│       ├── schemas.ts                   # zod request schemas
│       └── middleware/
│           ├── authenticate.ts
│           ├── validate.ts
│           └── errorHandler.ts
└── tests/
    ├── fakes/                           # in-memory repositories + FixedClock
    ├── domain/
    ├── services/
    └── http/
```

---

## 3. Module Details

### 3.1 Entry & composition

| File | Responsibility | ~Lines |
| :--- | :--- | :--- |
| `server.ts` | Loads config, calls `buildContainer()` and `createApp()`, starts listening, handles SIGTERM (close DB). | 25 |
| `app.ts` | `createApp(controllers)`: JSON body parsing, mounts `routes`, mounts `errorHandler`. Receives controllers as arguments, so it never constructs dependencies itself (DIP). | 35 |
| `container.ts` | **Only place that uses `new` on concrete classes.** Opens the DB, runs migrations, creates repositories, domain objects, services and controllers, returns them. | 70 |
| `config/env.ts` | Reads `PORT`, `DB_PATH`, etc. from `process.env`, validates, exports a frozen typed `Config` object. | 25 |

### 3.2 `domain/` — pure rules (no I/O, fully unit-testable)

| File | Contents | What it does | ~Lines |
| :--- | :--- | :--- | :--- |
| `types.ts` | `Level` (`0..8`), `CardState`, `Flashcard`, `DailySession`, `ReviewInput`, `ReviewOutcome`, `SessionStatus` | Shared type definitions and constants (`NEW_POOL = 0`, `COMPLETED = 8`). Plain data, no logic. | 60 |
| `gameSchedule.ts` | `GAME_SCHEDULE: ReadonlyArray<readonly Level[]>` (64 entries) | The Game Schedule table from `LeitnerSchedule.pdf` as data, each day's levels sorted descending. Data-only so it can be changed without touching logic (OCP). | 70 |
| `CycleCalendar.ts` | `cycleDayFor(startDate, date)`, `daysBetween(a, b)` | Converts a calendar date into cycle day 1–64: `((days since start) mod 64) + 1`. Handles dates before `startDate` by throwing. | 30 |
| `LevelScheduler.ts` | `class LevelScheduler` with `levelsForDay(cycleDay)` and `levelsDue(startDate, lastCompleteDate, today)` | Looks up one day's levels, and builds the catch-up list: unions the levels of every missed day plus today (≥64-day gap → all levels 1–7), de-duplicates, sorts descending (level 1 last). Returns `{ levels, isCatchUp }`. Takes the schedule in its constructor (DIP/OCP). | 55 |
| `ReviewRules.ts` | `interface LevelProgressionRule`, `class LeitnerProgressionRule` with `next(level, passed)` | Pure movement rules: pass at 1–6 → `level+1`; pass at 7 → `COMPLETED`; fail at 2–7 → `1`; fail at 1 → `1` (and flags `requeueAtBack`). Exposed via an interface so alternative rules can be swapped in (OCP/LSP). | 40 |
| `SpellingJudge.ts` | `interface SpellingJudge`, `class StrictAccentSpellingJudge` with `isCorrect(input, answer)` | Trims, lower-cases, then exact comparison with accents strict (`é` ≠ `e`). A separate class so a lenient variant could be added later. | 25 |

### 3.3 `ports/` — interfaces (the seams for DIP and testing)

Each is a small TypeScript `interface` (ISP).

| File | Methods | ~Lines |
| :--- | :--- | :--- |
| `Clock.ts` | `today(timeZone): string` (ISO date in the user's zone), `now(): string` | 8 |
| `FlashcardRepository.ts` | `findVisible(userId, id)` (shared or owned by user), `create(userId, flashcard)` | 12 |
| `CardStateRepository.ts` | all take `userId` first: `listByLevel(userId, level)` (ordered by `deck_position`), `get(userId, flashcardId)`, `save(userId, state)`, `moveToBack(userId, flashcardId)`, `introduceFromPool(userId, limit, date)` (inserts Level 1 rows for visible cards with no `card_state`, by `sort_order`; returns count) | 25 |
| `ReviewLogRepository.ts` | `append(userId, entry)` | 8 |
| `SessionRepository.ts` | `findByDate(userId, date)`, `findLastComplete(userId)`, `create(userId, session)`, `update(userId, session)` | 15 |
| `SettingsRepository.ts` | `get(userId)` → `{ startDate, newCardsPerDay, timeZone }`, `initialize(userId, startDate, timeZone)` | 10 |
| `UserRepository.ts` | `findByEmail(email)`, `create(email, passwordHash)` → `userId` | 8 |
| `PasswordHasher.ts` | `hash(plain)`, `verify(plain, hash)` | 6 |
| `TokenService.ts` | `issue(userId)`, `verify(token)` → `userId` | 6 |
| `UnitOfWork.ts` | `run<T>(fn: () => T): T` | 8 |

### 3.4 `services/` — use cases (orchestrate domain + ports, contain no SQL or HTTP)

| File | Class & key methods | What it does | ~Lines |
| :--- | :--- | :--- | :--- |
| `SessionService.ts` | `class SessionService` — `preview(userId)` and `start(userId, skipNewCards)` | `preview` is read-only (shows what starting would do, so the client can offer "skip new cards" first). `start` is idempotent: if today's session exists it is returned unchanged, resumes it. Otherwise: reads settings, finds the last complete session, asks `LevelScheduler` for levels due, creates the `daily_sessions` row, calls `NewCardIntroducer` (unless skipped), sets `current_level` to the first non-empty due level. Idempotent. | 90 |
| `TodayResolver.ts` | `class TodayResolver` — `resolve(userId)` | Loads the user's settings and computes their local "today" from their time zone via `Clock`. Shared by `SessionService`, `DeckService`, `ReviewService` so none repeat that logic. | 20 |
| `NewCardIntroducer.ts` | `class NewCardIntroducer` — `introduce(userId, session, settings)` | Single job: move up to `newCardsPerDay` cards from the New pool into Level 1, once per day (guarded by `session.newCardsAdded`), and record the count. Split from `SessionService` so the "new card policy" can change independently. | 35 |
| `DeckService.ts` | `class DeckService` — `currentDeck(userId)`, `advanceIfEmpty(userId, session)` | Returns the cards of the session's `current_level` joined with flashcard content (image, description; never the French word until reveal). Moves `current_level` to the next non-empty due level, and marks the session `complete` when none remain. | 60 |
| `ReviewService.ts` | `class ReviewService` — `reveal(userId, input)` (read-only: judges spelling, returns answer + phonetics) and `submit(userId, input)`; both share one private guard `loadTarget`. `submit` | Handles one answer inside `UnitOfWork.run`: load card → `SpellingJudge` → pass = spelling ∧ pronunciation → `LevelProgressionRule.next` → save `CardState` (move to back if Level 1 fail) → append `ReviewLog` → `DeckService.advanceIfEmpty`. Returns correct spelling, phonetic spelling, new level, next-card/complete flag. Constructor receives the judge, rule, repositories, clock (all injected). | 80 |
| `FlashcardService.ts` | `class FlashcardService` — `get(userId, id)`, `add(userId, data)` | Reads a flashcard visible to the user (throws `NotFoundError` otherwise); creates a private flashcard owned by the user. It joins the user's New pool implicitly. | 35 |
| `AuthService.ts` | `class AuthService` — `register(email, password)`, `login(email, password)` | Registers (hash password, create user, initialize `user_settings` with `start_date` = today) and logs in (verify hash, issue token). Same error for unknown email and wrong password, to avoid account enumeration. | 55 |

### 3.5 `infrastructure/` — SQLite implementations

| File | Contents | What it does | ~Lines |
| :--- | :--- | :--- | :--- |
| `SystemClock.ts` | `class SystemClock implements Clock` | Real date/time source, converting to the user's time zone. Tests use a `FixedClock` instead. | 15 |
| `Argon2PasswordHasher.ts` | `class Argon2PasswordHasher implements PasswordHasher` | Salted password hashing/verification. | 12 |
| `JwtTokenService.ts` | `class JwtTokenService implements TokenService` | Signs and verifies JWTs containing `userId`; secret and expiry from config. | 20 |
| `sqlite/database.ts` | `openDatabase(path)`, `runMigrations(db)` | Opens `better-sqlite3`, enables `foreign_keys` and WAL, applies numbered `.sql` migrations in order (tracked in a `schema_version` table), seeds the `schedule` table from `GAME_SCHEDULE` if used. | 45 |
| `sqlite/SqliteUnitOfWork.ts` | `class SqliteUnitOfWork implements UnitOfWork` | Wraps `db.transaction(fn)()` so a review is atomic. | 15 |
| `sqlite/Sqlite*Repository.ts` (6 files) | One class per port | Prepared statements, row ↔ domain-object mapping. Every user-owned query has `WHERE user_id = ?`. No business logic. | Flashcard 40, CardState 90, ReviewLog 25, Session 60, Settings 30, User 25 |
| `sqlite/migrations.ts` (SQL embedded in TypeScript so `tsc` builds need no asset copying) | `CREATE TABLE` for `users`, `user_settings`, `flashcards`, `card_state` (PK `user_id, flashcard_id`), `review_log`, `daily_sessions` (PK `user_id, session_date`) + indexes on `card_state(user_id, level, deck_position)` and `review_log(user_id, session_date)` | Schema from `SRS_Backend_Notes.md`. | 85 |

### 3.6 `http/` — transport layer

| File | Contents | What it does | ~Lines |
| :--- | :--- | :--- | :--- |
| `routes.ts` | `buildRouter(controllers)` | Maps the endpoints to controller methods (`GET /session/today` preview, `POST /session/start`). `/api/auth/*` is public; all other routes go through `authenticate`. | 25 |
| `schemas.ts` | zod schemas: `reviewBody`, `createFlashcardBody`, `startSessionBody`, `credentialsBody` | Declares valid request shapes in one place. | 30 |
| `controllers/SessionController.ts` | `today`, `start` | `today` calls `SessionService.preview`; `start` reads `skipNewCards` from the body and calls `SessionService.start`. | 25 |
| `controllers/AuthController.ts` | `register`, `login` | Validates body, calls `AuthService`, returns the token. | 25 |
| `controllers/DeckController.ts` | `daily(req, res)` | Calls `DeckService.currentDeck`. | 20 |
| `controllers/ReviewController.ts` | `submit(req, res)` | Calls `ReviewService.submit` with validated body. | 25 |
| `controllers/FlashcardController.ts` | `get`, `create` | Calls `FlashcardService`. | 35 |
| `middleware/authenticate.ts` | `authenticate(tokenService)` | Reads the `Authorization: Bearer` header, verifies the token, sets `req.userId`, otherwise 401. Controllers read `req.userId` and pass it to services. | 25 |
| `middleware/validate.ts` | `validate(schema)` | Express middleware that parses body/query with zod and returns 400 on failure. | 20 |
| `middleware/errorHandler.ts` | `errorHandler`, `class AppError` (+ `NotFoundError`, `ValidationError`, `UnauthorizedError`) | Maps typed errors to HTTP status codes; unknown errors → 500, no stack leaked. | 35 |

Controllers contain no business logic and never touch repositories. Controllers never accept a `user_id` from the body or query.

### 3.7 `tests/`

| Area | What is tested | ~Lines |
| :--- | :--- | :--- |
| `fakes/` | In-memory implementations of each port, `FixedClock`, `PassThroughUnitOfWork`. Proves LSP: services run unchanged against fakes. | 120 |
| `domain/` | `gameSchedule` has 64 entries, all sorted descending, all end in 1; `CycleCalendar` wrap at day 64→1; `LevelScheduler` catch-up (57+58 missed → `[6,3,2,1]`, ≥64-day gap → all levels); `LeitnerProgressionRule` every pass/fail case incl. L7 → Completed; `SpellingJudge` accents/case/whitespace. | 220 |
| `services/` | **User isolation:** two users with the same cards have independent levels, sessions, logs; one user cannot see another's private card (404). Walk through days 1–3 from the product notes; new cards added once per day; skip-new option; failed L1 card re-served; failed L4 card lands in L1 same session; session resume. | 250 |
| `http/` | Supertest smoke tests per endpoint: 401 without token, validation errors, happy paths. | 120 |

---

## 4. Line-Count Summary

| Layer | ~Lines |
| :--- | :--- |
| Entry, config, composition | 160 |
| `domain/` | 280 |
| `ports/` | 106 |
| `services/` | 350 |
| `infrastructure/` | 455 |
| `http/` | 265 |
| **Production code total** | **≈ 1,620 planned (see Build Status for actuals)** |
| `tests/` | ≈ 730 |

---

## 5. Request Flow Example — `POST /api/review`

1. `routes.ts` → `authenticate` (sets `req.userId`) → `validate(reviewBody)` → `ReviewController.submit`.
2. `ReviewController` calls `ReviewService.submit(req.userId, { flashcardId, spellingInput, pronunciationCorrect })`.
3. Inside `UnitOfWork.run`: `CardStateRepository.get(userId, …)` → `SpellingJudge.isCorrect` → `LevelProgressionRule.next` → `CardStateRepository.save` (and `moveToBack` on Level 1 fail) → `ReviewLogRepository.append` → `DeckService.advanceIfEmpty`.
4. Controller returns JSON; `errorHandler` converts any `AppError` to a status code.

Nothing in steps 2–3 imports Express or SQLite; replacing SQLite with Postgres means writing new `infrastructure/` classes and changing `container.ts` only.

---

## 6. Suggested Build Order

1. `domain/` + its tests (no dependencies, proves the Leitner rules first).
2. `ports/` + `tests/fakes/`.
3. `services/` against fakes (days 1–3 walkthrough as tests).
4. `infrastructure/sqlite/` + migration.
5. Auth (`AuthService`, hasher, token service, `authenticate`) and `http/` + `container.ts` + `server.ts`.

---

## 7. Build Status

Built in `backend/` with pnpm (`pnpm dev`, `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm start`). Structure follows this document; deviations from the plan:

| Deviation | Reason |
| :--- | :--- |
| `GET /api/session/today` is **read-only** and a new `POST /api/session/start` starts the session | A GET that adds new cards would make the "skip new cards" option impossible to choose before cards were added. |
| Game Schedule is a code constant, no `schedule` table | It is global static data; a table adds a seeding step and no value. |
| Migrations embedded in `migrations.ts` instead of `.sql` files | `tsc` does not copy `.sql` assets into `dist/`. |
| Added `TodayResolver` and `domain/errors.ts` | Shared per-user "today" lookup; transport-agnostic errors thrown by services and mapped to HTTP codes. |
| `user_settings.streak` column exists but is not updated | Streak rules were never specified; left for a later change. |

Config (environment): `PORT` (3000), `DB_PATH` (`./flashcards.db`), `JWT_SECRET` (**required in production**, min 32 chars), `JWT_EXPIRES_IN` (`30d`).

Not built (out of scope so far): a seed/import script for the shared card library (users can add private cards via `POST /api/flashcards`; shared cards are rows with `owner_user_id IS NULL`) and rate limiting on `/api/auth/*`. CORS is not needed: the PWA is served by the backend (same origin), and in development Vite proxies `/api`.
