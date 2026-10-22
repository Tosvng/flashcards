import { emptySlots, isComplete, writeSlots, backspaceSlots, slotsToText, type Slots } from './letterSlots';
import type { DeckCard, RevealResult, ReviewResult } from './types';

/**
 * State machine for reviewing ONE card:
 * answering → revealing → revealed → submitting → result
 * A failed network step returns to the previous phase with `error` set.
 */
export type ReviewPhase = 'answering' | 'revealing' | 'revealed' | 'submitting' | 'result';

export interface ReviewState {
  phase: ReviewPhase;
  card: DeckCard;
  slots: Slots;
  focusIndex: number;
  /** Set once the server has revealed the answer. */
  reveal: RevealResult | null;
  pronunciationCorrect: boolean | null;
  result: ReviewResult | null;
  error: string | null;
}

export type ReviewEvent =
  | { type: 'LETTER_CHANGED'; index: number; text: string }
  | { type: 'BACKSPACE'; index: number }
  | { type: 'SUBMIT_SPELLING' }
  | { type: 'REVEAL_OK'; reveal: RevealResult }
  | { type: 'REVEAL_FAILED'; message: string }
  | { type: 'MARK_PRONUNCIATION'; correct: boolean }
  | { type: 'SAVED'; result: ReviewResult }
  | { type: 'SAVE_FAILED'; message: string }
  | { type: 'RESET'; card: DeckCard };

export function initialReviewState(card: DeckCard): ReviewState {
  return {
    phase: 'answering',
    card,
    slots: emptySlots(card.letterCount),
    focusIndex: 0,
    reveal: null,
    pronunciationCorrect: null,
    result: null,
    error: null,
  };
}

/** The spelling the user typed, as sent to the server. */
export const spellingOf = (state: ReviewState): string => slotsToText(state.slots);

/** Pure reducer; events that are not legal in the current phase are ignored. */
export function reviewReducer(state: ReviewState, event: ReviewEvent): ReviewState {
  if (event.type === 'RESET') return initialReviewState(event.card);

  switch (state.phase) {
    case 'answering':
      switch (event.type) {
        case 'LETTER_CHANGED': {
          const edit = writeSlots(state.slots, event.index, event.text);
          return { ...state, slots: edit.slots, focusIndex: edit.focusIndex, error: null };
        }
        case 'BACKSPACE': {
          const edit = backspaceSlots(state.slots, event.index);
          return { ...state, slots: edit.slots, focusIndex: edit.focusIndex, error: null };
        }
        case 'SUBMIT_SPELLING':
          return isComplete(state.slots) ? { ...state, phase: 'revealing', error: null } : state;
        default:
          return state;
      }
    case 'revealing':
      if (event.type === 'REVEAL_OK') return { ...state, phase: 'revealed', reveal: event.reveal, error: null };
      if (event.type === 'REVEAL_FAILED') return { ...state, phase: 'answering', error: event.message };
      return state;
    case 'revealed':
      if (event.type === 'MARK_PRONUNCIATION') {
        return { ...state, phase: 'submitting', pronunciationCorrect: event.correct, error: null };
      }
      return state;
    case 'submitting':
      if (event.type === 'SAVED') return { ...state, phase: 'result', result: event.result, error: null };
      if (event.type === 'SAVE_FAILED') {
        return { ...state, phase: 'revealed', pronunciationCorrect: null, error: event.message };
      }
      return state;
    case 'result':
      return state;
  }
}
