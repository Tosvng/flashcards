import type { DeckView } from '../../domain/types';

export interface DeckGateway {
  current(): Promise<DeckView>;
}
