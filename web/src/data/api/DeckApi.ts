import type { DeckGateway } from '../../application/ports/DeckGateway';
import type { DeckView } from '../../domain/types';
import type { HttpClient } from '../http/HttpClient';

export class DeckApi implements DeckGateway {
  constructor(private readonly http: HttpClient) {}

  current(): Promise<DeckView> {
    return this.http.get('/api/decks/daily');
  }
}
