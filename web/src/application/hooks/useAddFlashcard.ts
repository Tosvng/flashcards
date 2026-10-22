import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { NewFlashcard } from '../../domain/types';
import { keys } from '../queryKeys';
import { useServices } from '../ServicesContext';

export function useAddFlashcard() {
  const { flashcards } = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (card: NewFlashcard) => flashcards.add(card),
    // A new word changes how many new cards today's preview says will be added.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.session });
      void queryClient.invalidateQueries({ queryKey: keys.myWords });
    },
  });
}
