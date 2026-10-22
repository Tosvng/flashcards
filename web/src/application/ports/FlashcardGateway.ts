import type { Flashcard, NewFlashcard } from '../../domain/types';

export interface FlashcardGateway {
  add(card: NewFlashcard): Promise<Flashcard>;
  /** The words the user added, oldest first. */
  listMine(): Promise<Flashcard[]>;
  update(id: number, card: NewFlashcard): Promise<Flashcard>;
}
