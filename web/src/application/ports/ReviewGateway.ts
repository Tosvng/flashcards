import type { RevealInput, RevealResult, ReviewInput, ReviewResult } from '../../domain/types';

export interface ReviewGateway {
  /** Judges the spelling and returns the answer + phonetics without changing any state. */
  reveal(input: RevealInput): Promise<RevealResult>;
  submit(input: ReviewInput): Promise<ReviewResult>;
}
