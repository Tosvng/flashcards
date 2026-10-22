import { useCallback, useReducer } from 'react';
import { errorMessage } from '../../domain/errors';
import { isComplete } from '../../domain/letterSlots';
import { initialReviewState, reviewReducer, spellingOf } from '../../domain/reviewFlow';
import type { DeckCard } from '../../domain/types';
import { useRevealAnswer } from './useRevealAnswer';
import { useSubmitReview } from './useSubmitReview';

/**
 * Drives the review of ONE card: owns the reducer and calls the reveal / submit use cases
 * on the right transitions. Mount it with `key` per card so each card starts fresh.
 */
export function useReviewFlow(card: DeckCard) {
  const [state, dispatch] = useReducer(reviewReducer, card, initialReviewState);
  const reveal = useRevealAnswer();
  const submit = useSubmitReview();

  const setLetter = useCallback((index: number, text: string) => dispatch({ type: 'LETTER_CHANGED', index, text }), []);
  const backspace = useCallback((index: number) => dispatch({ type: 'BACKSPACE', index }), []);

  const submitSpelling = useCallback(async () => {
    if (state.phase !== 'answering' || !isComplete(state.slots)) return;
    dispatch({ type: 'SUBMIT_SPELLING' });
    try {
      const result = await reveal.mutateAsync({ flashcardId: card.flashcardId, spellingInput: spellingOf(state) });
      dispatch({ type: 'REVEAL_OK', reveal: result });
    } catch (err) {
      dispatch({ type: 'REVEAL_FAILED', message: errorMessage(err) });
    }
  }, [state, card.flashcardId, reveal]);

  const markPronunciation = useCallback(
    async (correct: boolean) => {
      if (state.phase !== 'revealed') return;
      dispatch({ type: 'MARK_PRONUNCIATION', correct });
      try {
        const result = await submit.mutateAsync({
          flashcardId: card.flashcardId,
          spellingInput: spellingOf(state),
          pronunciationCorrect: correct,
        });
        dispatch({ type: 'SAVED', result });
      } catch (err) {
        dispatch({ type: 'SAVE_FAILED', message: errorMessage(err) });
      }
    },
    [state, card.flashcardId, submit],
  );

  return { state, setLetter, backspace, submitSpelling, markPronunciation };
}
