import type { ReviewGateway } from '../../application/ports/ReviewGateway';
import type { RevealInput, RevealResult, ReviewInput, ReviewResult } from '../../domain/types';
import type { HttpClient } from '../http/HttpClient';

export class ReviewApi implements ReviewGateway {
  constructor(private readonly http: HttpClient) {}

  reveal(input: RevealInput): Promise<RevealResult> {
    return this.http.post('/api/review/reveal', input);
  }

  submit(input: ReviewInput): Promise<ReviewResult> {
    return this.http.post('/api/review', input);
  }
}
