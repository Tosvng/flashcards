import type { Flashcard, NewFlashcard } from '../../domain/types';

export interface FlashcardGateway {
  add(card: NewFlashcard): Promise<Flashcard>;
}
