import { createContext, useContext, type ReactNode } from 'react';
import type { AuthGateway } from './ports/AuthGateway';
import type { DeckGateway } from './ports/DeckGateway';
import type { FlashcardGateway } from './ports/FlashcardGateway';
import type { ReviewGateway } from './ports/ReviewGateway';
import type { SessionExpiredSignal } from './ports/SessionExpiredSignal';
import type { SessionGateway } from './ports/SessionGateway';
import type { TokenStorage } from './ports/TokenStorage';

/** Everything the application layer needs from the outside world, as interfaces. */
export interface Services {
  auth: AuthGateway;
  session: SessionGateway;
  deck: DeckGateway;
  review: ReviewGateway;
  flashcards: FlashcardGateway;
  tokens: TokenStorage;
  sessionExpired: SessionExpiredSignal;
}

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({ services, children }: { services: Services; children: ReactNode }) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('useServices must be used inside <ServicesProvider>');
  return services;
}
