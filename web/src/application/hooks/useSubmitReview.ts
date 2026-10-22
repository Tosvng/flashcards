import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReviewInput } from '../../domain/types';
import { keys } from '../queryKeys';
import { useServices } from '../ServicesContext';

export function useSubmitReview() {
  const { review } = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewInput) => review.submit(input),
    // The deck is refetched explicitly when the user moves to the next card (see useReviewQueue).
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.session }),
  });
}
