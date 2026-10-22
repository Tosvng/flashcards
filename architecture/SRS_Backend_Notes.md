# Backend Architecture Blueprint (Node.js + SQLite)

This document outlines the minimal viable backend architecture for the Leitner-box Spaced Repetition System (SRS) application, designed to run on a Hostinger Virtual Machine using Node.js and SQLite. Product behaviour (levels, session flow, Game Schedule, catch-up) is specified in `SRS_App_Notes.md`; this document covers how the backend implements it.

## ⚙️ Core Stack Technologies
*   **Server:** Node.js + Express.js (The scalable HTTP service framework).
*   **Database:** SQLite (`flashcards.db` file) (The transactional, embedded database).
*   **Language:** JavaScript/TypeScript.
*   **Host:** Hostinger VM (Provides persistent storage for the `.db` file and runs the Node.js process).

## 🏗️ Architectural Layers

The application follows a simple, robust three-layer pattern:

1.  **Presentation Layer (Client/Frontend):** The Vite + React PWA (`web/`)lication. It sends HTTP requests and receives JSON data.
2.  **Application Layer (Backend/Express):** The Node.js server endpoints. It handles routing, middleware, and business logic orchestration.
3.  **Data Layer (Database/SQLite):** The `flashcards.db` file. It handles persistence of all word data, card levels, and review history.

---

## 💾 Database Schema (SQLite)

**Multi-user model:** `flashcards` is shared content. Everything that records a user's progress carries a `user_id`, and every query is scoped by it. The `user_id` always comes from the authenticated request (never from the request body).

### 1. `users` Table
*   **Purpose:** Accounts and authentication.
*   **Fields:** `user_id` (PK), `email` (unique), `password_hash`, `created_at`.

### 2. `user_settings` Table
*   **Purpose:** Per-user settings and stats (replaces the old `user_progress`).
*   **Fields:** `user_id` (PK, FK to `users`), `start_date` (Day 1 of this user's 64-day cycle), `new_cards_per_day` (default `10`), `time_zone` (IANA, default `UTC`), `streak` (column exists; **not yet maintained**), `settings_json`.

### 3. `flashcards` Table
*   **Purpose:** Static card content, shared by all users.
*   **Fields:** `flashcard_id` (PK), `owner_user_id` (nullable FK to `users`; `NULL` = shared library card, set = private card created by that user), `sort_order` (order in which new cards are introduced), `french_text`, `english_translation`, `photo_url`, `description`, `phonetic_spelling` (nullable), `created_at`.
*   **Visibility:** a user sees cards where `owner_user_id IS NULL OR owner_user_id = :user_id`.

### 4. `card_state` Table
*   **Purpose:** Which Leitner box each card is in **for each user**. There are no per-card due dates; a card is due when its level is due on the Game Schedule.
*   **Fields:** `user_id` (FK), `flashcard_id` (FK), `level` (`1`–`7`, `8` = Completed), `introduced_on`, `last_reviewed_on`, `deck_position` (ordering within a level; a failed Level 1 card is moved to the back). **PK = (`user_id`, `flashcard_id`).**
*   **New pool is implicit:** a visible card with **no** `card_state` row for that user is in the New pool (level 0). Introducing a card inserts a Level 1 row. This avoids creating rows for every user whenever a card is added. New cards are picked by `flashcards.sort_order`.

### 5. `review_log` Table
*   **Purpose:** Append-only history of every review attempt (stats, audit, undo).
*   **Fields:** `log_id` (PK), `user_id` (FK), `flashcard_id` (FK), `session_date`, `cycle_day`, `level_before`, `level_after`, `spelling_correct`, `pronunciation_correct`, `passed`, `attempted_at`. Index on (`user_id`, `session_date`).

### 6. `daily_sessions` Table
*   **Purpose:** One row per user per calendar day they open the app. Makes "add 10 new cards" idempotent, stores the resumable queue, and records the last completed day for missed-day math.
*   **Fields:** `user_id` (FK), `session_date`, `cycle_day`, `levels_due` (JSON array, descending, e.g. `[6,3,2,1]`), `is_catch_up`, `skip_new_cards`, `new_cards_added`, `current_level`, `status` (`in_progress` | `complete`), `completed_at`. **PK = (`user_id`, `session_date`).**

### 7. Game Schedule (constant, not a table)
*   **Purpose:** The 64-day Game Schedule lookup from `LeitnerSchedule.pdf` (see `SRS_App_Notes.md` §4). Global and identical for all users, so it lives in code (`domain/gameSchedule.ts`), not the database.

---

## 🔐 Authentication & User Scoping

*   **Auth:** token-based (JWT or opaque session token in an `Authorization: Bearer` header). Passwords are stored only as salted hashes (argon2/bcrypt).
*   **Middleware:** an `authenticate` middleware validates the token and attaches `req.userId`. Every endpoint except register/login requires it.
*   **Scoping rule:** controllers pass `userId` to services, and services pass it to every repository call. No repository method reads or writes user data without a `userId`.
*   **Time zones:** "today" is computed in the user's time zone (stored in `settings_json`), because each user's daily session and cycle day depend on their local date.

---

## 🧭 API Endpoints (Express.js)

All endpoints communicate with the web frontend via standard REST principles and return JSON. All endpoints below `auth` require a valid token and act only on the authenticated user's data.

| Endpoint | HTTP Method | Function | SRS Role / Logic Handled |
| :--- | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | Creates a user (`email`, `password`) plus their `user_settings` row (`start_date` = today). | Returns a token. |
| `/api/auth/login` | `POST` | Verifies credentials. | Returns a token. |
| `/api/session/today` | `GET` | **Read-only.** Returns today's session if started, otherwise a preview (`started: false`): cycle day, levels due, `is_catch_up`, how many new cards starting would add. | Lets the client show the catch-up screen and the "skip new cards" choice *before* anything is changed. |
| `/api/session/start` | `POST` | Starts today's session. Body: `{ skipNewCards?: boolean }`. Idempotent: if already started, returns the existing session and ignores `skipNewCards`. | **Core SRS:** Creates today's `daily_sessions` row, determines levels due (including missed days), adds new cards to Level 1 (unless skipped), points `current_level` at the first non-empty due level. |
| `/api/decks/daily` | `GET` | Returns the user's cards for the session's current level, in `deck_position` order. | Level 1 deck includes new cards, cards demoted earlier today, and leftover Level 1 cards. |
| `/api/review/reveal` | `POST` | Judges a spelling attempt and returns `spellingCorrect`, `correctSpelling`, `phoneticSpelling`. **Changes nothing.** Body: `flashcard_id`, `spelling_input`. | Lets the app show the answer and phonetics *before* the pronunciation self-check. Same guards as `/api/review` (session started, card in the current level). `/api/review` still re-judges the spelling, so the client cannot fake a pass. |
| `/api/review` | `POST` | Submits one review attempt: `flashcard_id`, `spelling_input`, `pronunciation_correct`. | **Core SRS:** Server judges spelling, applies promote/demote to this user's `card_state`, writes `review_log`, returns `passed`, correct spelling, `phonetic_spelling`, new `level`. |
| `/api/flashcards/:id` | `GET` | Retrieves a single word's details (404 if not visible to the user). | Reference material. |
| `/api/flashcards` | `POST` | Adds a private word owned by the user. | Inserts into `flashcards` with `owner_user_id`; it enters that user's New pool implicitly. |


## 🤖 Business Logic Flow (The SRS Engine)

### Choosing today's levels
1.  **Cycle day:** `((today − user's start_date) days mod 64) + 1`, with `today` in the user's time zone.
2.  **Days to cover:** every date after the last `complete` session up to and including today. If there is no previous session, only today. If the gap is ≥ 64 days, all levels 1–7.
3.  **Levels due:** union of `schedule.levels` for each covered cycle day, de-duplicated, sorted descending (Level 1 always last). `is_catch_up` = more than one day covered.
4.  **New cards:** unless `skip_new_cards` or `new_cards_added > 0` already, insert up to `new_cards_per_day` `card_state` rows at level `1` for this user, picked from visible cards with no `card_state` row, by `sort_order`. Never back-filled for missed days.

### Applying a review (POST `/api/review`)
1.  **Judge spelling:** exact match after trim and case-fold; accents strict.
2.  **Pass** = spelling correct AND `pronunciation_correct`.
3.  **Level change:**
    *   Pass at Level 1–6 → `level + 1`.
    *   Pass at Level 7 → `level = 8` (Completed).
    *   Fail at Level 2–7 → `level = 1` (appears in today's Level 1 pass).
    *   Fail at Level 1 → stays at 1, `deck_position` moved to the back of the Level 1 deck; it is re-served until the Level 1 deck is empty.
4.  **Persist:** update this user's `card_state`, append `review_log`, advance `daily_sessions.current_level` when the current level's deck is empty. Mark the session `complete` when all due levels are empty.
5.  **Response:** return the result, correct spelling, phonetic spelling, and the next card or session-complete flag.

All steps in "Applying a review" run in a single SQLite transaction.

---

## 🌐 Serving the PWA and HTTP behaviour

*   **`WEB_DIR`** (optional): directory of the built PWA (`web/dist`). When set, the same process serves the app and the API, so the browser sees one origin (no CORS, no mixed content). The server refuses to start if the directory has no `index.html`.
*   **Caching:** every `/api` response carries `Cache-Control: no-store`. Static files: hashed bundles under `/assets` `immutable` for a year, `index.html` / `sw.js` / the manifest `no-cache`, other assets one day.
*   **Routing:** `/api/*` always answers JSON (401 or 404), never the app shell. Paths whose last segment contains a dot are treated as files and 404 if missing; other GET paths that accept HTML fall back to `index.html` for client-side routing.
