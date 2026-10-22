import { useQuery } from '@tanstack/react-query';
import { keys } from '../queryKeys';
import { useServices } from '../ServicesContext';

/** The deck changes after every review, so it is never served from cache. */
export function useDeck() {
  const { deck } = useServices();
  return useQuery({ queryKey: keys.deck, queryFn: () => deck.current(), staleTime: 0, gcTime: 0 });
}
