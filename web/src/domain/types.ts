/** DTOs mirroring the backend's JSON exactly. */
export type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7;
/** 8 = Completed. */
export type CardLevel = Level | 8;

export type SessionStatus = 'not_started' | 'in_progress' | 'complete';

export interface SessionSummary {
  /** False for a read-only preview of a session that has not been started. */
  started: boolean;
  sessionDate: string;
  cycleDay: number;
  levelsDue: Level[];
  isCatchUp: boolean;
  newCardsAdded: number;
  skipNewCards: boolean;
  currentLevel: Level | null;
  status: SessionStatus;
}

export interface DeckCard {
  flashcardId: number;
  photoUrl: string;
  description: string;
  letterCount: number;
}

export interface DeckView {
  sessionComplete: boolean;
  level: Level | null;
  cards: DeckCard[];
}

export interface RevealInput {
  flashcardId: number;
  spellingInput: string;
}

export interface RevealResult {
  spellingCorrect: boolean;
  correctSpelling: string;
  phoneticSpelling: string | null;
}

export interface ReviewInput extends RevealInput {
  pronunciationCorrect: boolean;
}

export interface ReviewResult extends RevealResult {
  passed: boolean;
  newLevel: CardLevel;
  sessionComplete: boolean;
  currentLevel: Level | null;
}

export interface NewFlashcard {
  frenchText: string;
  englishTranslation: string;
  photoUrl: string;
  description: string;
  phoneticSpelling: string | null;
}

export interface Flashcard extends NewFlashcard {
  flashcardId: number;
  ownerUserId: number | null;
  sortOrder: number;
  createdAt: string;
}

export interface AuthResult {
  userId: number;
  token: string;
}
