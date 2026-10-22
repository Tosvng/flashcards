export interface Migration {
  version: number;
  sql: string;
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE users (
        user_id       INTEGER PRIMARY KEY AUTOINCREMENT,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );

      CREATE TABLE user_settings (
        user_id           INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
        start_date        TEXT NOT NULL,
        new_cards_per_day INTEGER NOT NULL DEFAULT 10 CHECK (new_cards_per_day >= 0),
        time_zone         TEXT NOT NULL DEFAULT 'UTC',
        streak            INTEGER NOT NULL DEFAULT 0,
        settings_json     TEXT NOT NULL DEFAULT '{}'
      );

      CREATE TABLE flashcards (
        flashcard_id        INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_user_id       INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        sort_order          INTEGER NOT NULL,
        french_text         TEXT NOT NULL,
        english_translation TEXT NOT NULL,
        photo_url           TEXT NOT NULL,
        description         TEXT NOT NULL,
        phonetic_spelling   TEXT,
        created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      CREATE INDEX idx_flashcards_owner ON flashcards(owner_user_id, sort_order);

      CREATE TABLE card_state (
        user_id          INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        flashcard_id     INTEGER NOT NULL REFERENCES flashcards(flashcard_id) ON DELETE CASCADE,
        level            INTEGER NOT NULL CHECK (level BETWEEN 1 AND 8),
        introduced_on    TEXT NOT NULL,
        last_reviewed_on TEXT,
        deck_position    INTEGER NOT NULL,
        PRIMARY KEY (user_id, flashcard_id)
      );
      CREATE INDEX idx_card_state_deck ON card_state(user_id, level, deck_position);

      CREATE TABLE review_log (
        log_id                INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id               INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        flashcard_id          INTEGER NOT NULL REFERENCES flashcards(flashcard_id) ON DELETE CASCADE,
        session_date          TEXT NOT NULL,
        cycle_day             INTEGER NOT NULL,
        level_before          INTEGER NOT NULL,
        level_after           INTEGER NOT NULL,
        spelling_correct      INTEGER NOT NULL,
        pronunciation_correct INTEGER NOT NULL,
        passed                INTEGER NOT NULL,
        attempted_at          TEXT NOT NULL
      );
      CREATE INDEX idx_review_log_user_date ON review_log(user_id, session_date);

      CREATE TABLE daily_sessions (
        user_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        session_date    TEXT NOT NULL,
        cycle_day       INTEGER NOT NULL,
        levels_due      TEXT NOT NULL,
        is_catch_up     INTEGER NOT NULL,
        skip_new_cards  INTEGER NOT NULL,
        new_cards_added INTEGER NOT NULL,
        current_level   INTEGER,
        status          TEXT NOT NULL CHECK (status IN ('in_progress','complete')),
        completed_at    TEXT,
        PRIMARY KEY (user_id, session_date)
      );
    `,
  },
];
