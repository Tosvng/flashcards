import { useMutation, useQueryClient } from '@tanstack/react-query';
import { keys } from '../queryKeys';
import { useServices } from '../ServicesContext';

export function useStartSession() {
  const { session } = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (skipNewCards: boolean) => session.start(skipNewCards),
    onSuccess: (summary) => {
      queryClient.setQueryData(keys.session, summary);
      void queryClient.invalidateQueries({ queryKey: keys.deck });
    },
  });
}
