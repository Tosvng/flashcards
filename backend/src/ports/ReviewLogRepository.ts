import type { ReviewLogEntry } from '../domain/types.js';

export interface ReviewLogRepository {
  append(userId: number, entry: ReviewLogEntry): void;
}
