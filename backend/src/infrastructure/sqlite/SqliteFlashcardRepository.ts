import type { Flashcard, NewFlashcard } from '../../domain/types.js';
import type { FlashcardRepository } from '../../ports/FlashcardRepository.js';
import type { Db } from './database.js';

interface Row {
  flashcard_id: number;
  owner_user_id: number | null;
  sort_order: number;
  french_text: string;
  english_translation: string;
  photo_url: string;
  description: string;
  phonetic_spelling: string | null;
  created_at: string;
}

const toFlashcard = (r: Row): Flashcard => ({
  flashcardId: r.flashcard_id,
  ownerUserId: r.owner_user_id,
  sortOrder: r.sort_order,
  frenchText: r.french_text,
  englishTranslation: r.english_translation,
  photoUrl: r.photo_url,
  description: r.description,
  phoneticSpelling: r.phonetic_spelling,
  createdAt: r.created_at,
});

export class SqliteFlashcardRepository implements FlashcardRepository {
  constructor(private readonly db: Db) {}

  findVisible(userId: number, flashcardId: number): Flashcard | null {
    const row = this.db
      .prepare('SELECT * FROM flashcards WHERE flashcard_id = ? AND (owner_user_id IS NULL OR owner_user_id = ?)')
      .get(flashcardId, userId) as Row | undefined;
    return row ? toFlashcard(row) : null;
  }

  findManyVisible(userId: number, flashcardIds: number[]): Flashcard[] {
    if (flashcardIds.length === 0) return [];
    const marks = flashcardIds.map(() => '?').join(',');
    const rows = this.db
      .prepare(`SELECT * FROM flashcards WHERE flashcard_id IN (${marks}) AND (owner_user_id IS NULL OR owner_user_id = ?)`)
      .all(...flashcardIds, userId) as Row[];
    return rows.map(toFlashcard);
  }

  create(userId: number, card: NewFlashcard): Flashcard {
    const id = Number(
      this.db
        .prepare(
          `INSERT INTO flashcards (owner_user_id, sort_order, french_text, english_translation, photo_url, description, phonetic_spelling)
           VALUES (?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM flashcards), ?, ?, ?, ?, ?)`,
        )
        .run(userId, card.frenchText, card.englishTranslation, card.photoUrl, card.description, card.phoneticSpelling).lastInsertRowid,
    );
    return this.findVisible(userId, id)!;
  }
}
