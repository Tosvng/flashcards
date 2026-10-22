import type { FlashcardGateway } from '../../application/ports/FlashcardGateway';
import type { Flashcard, NewFlashcard } from '../../domain/types';
import type { HttpClient } from '../http/HttpClient';

export class FlashcardApi implements FlashcardGateway {
  constructor(private readonly http: HttpClient) {}

  add(card: NewFlashcard): Promise<Flashcard> {
    return this.http.post('/api/flashcards', card);
  }
}
