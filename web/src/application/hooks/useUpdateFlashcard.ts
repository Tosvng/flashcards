import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { NewFlashcard } from '../../domain/types';
import { keys } from '../queryKeys';
import { useServices } from '../ServicesContext';

export function useUpdateFlashcard(id: number) {
  const { flashcards } = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (card: NewFlashcard) => flashcards.update(id, card),
    // An edited card changes what the review deck shows.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.myWords });
      void queryClient.invalidateQueries({ queryKey: keys.deck });
    },
  });
}
