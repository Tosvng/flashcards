import { useMutation } from '@tanstack/react-query';
import type { RevealInput } from '../../domain/types';
import { useServices } from '../ServicesContext';

export function useRevealAnswer() {
  const { review } = useServices();
  return useMutation({ mutationFn: (input: RevealInput) => review.reveal(input) });
}
