import { useMutation, useQueryClient } from '@tanstack/react-query';
import { keys } from '../queryKeys';
import { useServices } from '../ServicesContext';

export function useDeleteFlashcard(id: number) {
  const { flashcards } = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => flashcards.remove(id),
    // A deleted card leaves the word list and any review deck that held it.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.myWords });
      void queryClient.invalidateQueries({ queryKey: keys.deck });
    },
  });
}
