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

  /** Adds a private card owned by the user; it joins their New pool implicitly. */
  add(userId: number, data: NewFlashcard): Flashcard {
    return this.flashcards.create(userId, data);
  }
}
