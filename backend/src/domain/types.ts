/** Leitner levels 1-7; 8 = Completed. A card with no card_state row is in the New pool. */
export type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const COMPLETED = 8 as const;
export type CardLevel = Level | typeof COMPLETED;

export const LEVELS: readonly Level[] = [1, 2, 3, 4, 5, 6, 7];
export const CYCLE_LENGTH = 64;

/** ISO calendar date, YYYY-MM-DD. */
export type IsoDate = string;

export interface Flashcard {
  flashcardId: number;
  ownerUserId: number | null;
  sortOrder: number;
  frenchText: string;
  englishTranslation: string;
  photoUrl: string;
  description: string;
  phoneticSpelling: string | null;
  createdAt: string;
}

export type NewFlashcard = Omit<Flashcard, 'flashcardId' | 'ownerUserId' | 'sortOrder' | 'createdAt'>;

export interface CardState {
  flashcardId: number;
  level: CardLevel;
  introducedOn: IsoDate;
  lastReviewedOn: IsoDate | null;
  deckPosition: number;
}

export type SessionStatus = 'in_progress' | 'complete';

export interface DailySession {
  sessionDate: IsoDate;
  cycleDay: number;
  levelsDue: Level[];
  isCatchUp: boolean;
  skipNewCards: boolean;
  newCardsAdded: number;
  /** Level currently being reviewed; null when the session is complete. */
  currentLevel: Level | null;
  status: SessionStatus;
  completedAt: string | null;
}

export interface UserSettings {
  startDate: IsoDate;
  newCardsPerDay: number;
  timeZone: string;
}

export interface ReviewInput {
  flashcardId: number;
  spellingInput: string;
  pronunciationCorrect: boolean;
}

export interface ReviewLogEntry {
  flashcardId: number;
  sessionDate: IsoDate;
  cycleDay: number;
  levelBefore: CardLevel;
  levelAfter: CardLevel;
  spellingCorrect: boolean;
  pronunciationCorrect: boolean;
  passed: boolean;
  attemptedAt: string;
}
