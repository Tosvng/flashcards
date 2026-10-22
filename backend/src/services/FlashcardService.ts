import { NotFoundError } from '../domain/errors.js';
import type { Flashcard, NewFlashcard } from '../domain/types.js';
import type { FlashcardRepository } from '../ports/FlashcardRepository.js';

export class FlashcardService {
  constructor(private readonly flashcards: FlashcardRepository) {}

  get(userId: number, flashcardId: number): Flashcard {
    const card = this.flashcards.findVisible(userId, flashcardId);
    if (!card) throw new NotFoundError('Flashcard not found');
    return card;
  }

  /** The user's own words (shared library cards are not editable). */
  listOwned(userId: number): Flashcard[] {
    return this.flashcards.findOwned(userId);
  }

  /** Edits a word the user added. Shared cards and other users' cards read as not found. */
  update(userId: number, flashcardId: number, data: NewFlashcard): Flashcard {
    const card = this.flashcards.update(userId, flashcardId, data);
    if (!card) throw new NotFoundError('Flashcard not found');
    return card;
  }

  /** Adds a private card owned by the user; it joins their New pool implicitly. */
  add(userId: number, data: NewFlashcard): Flashcard {
    return this.flashcards.create(userId, data);
  }
}
