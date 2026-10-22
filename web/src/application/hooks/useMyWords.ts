import { useQuery } from '@tanstack/react-query';
import { keys } from '../queryKeys';
import { useServices } from '../ServicesContext';

export function useMyWords() {
  const { flashcards } = useServices();
  return useQuery({ queryKey: keys.myWords, queryFn: () => flashcards.listMine() });
}
