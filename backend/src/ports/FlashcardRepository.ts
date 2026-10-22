import type { Flashcard, NewFlashcard } from '../domain/types.js';

export interface FlashcardRepository {
  /** Returns the card only if it is shared or owned by `userId`. */
  findVisible(userId: number, flashcardId: number): Flashcard | null;
  findManyVisible(userId: number, flashcardIds: number[]): Flashcard[];
  create(userId: number, card: NewFlashcard): Flashcard;
}
