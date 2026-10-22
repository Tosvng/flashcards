import { NotFoundError, ValidationError } from '../domain/errors.js';
import type { LevelProgressionRule } from '../domain/ReviewRules.js';
import type { SpellingJudge } from '../domain/SpellingJudge.js';
import type { CardLevel, Level, ReviewInput } from '../domain/types.js';
import type { CardStateRepository } from '../ports/CardStateRepository.js';
import type { Clock } from '../ports/Clock.js';
import type { FlashcardRepository } from '../ports/FlashcardRepository.js';
import type { ReviewLogRepository } from '../ports/ReviewLogRepository.js';
import type { SessionRepository } from '../ports/SessionRepository.js';
import type { UnitOfWork } from '../ports/UnitOfWork.js';
import type { DeckService } from './DeckService.js';
import type { TodayResolver } from './TodayResolver.js';

export interface ReviewResult {
  passed: boolean;
  spellingCorrect: boolean;
  correctSpelling: string;
  phoneticSpelling: string | null;
  newLevel: CardLevel;
  sessionComplete: boolean;
  currentLevel: Level | null;
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

export class ReviewService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly cardStates: CardStateRepository,
    private readonly flashcards: FlashcardRepository,
    private readonly reviewLog: ReviewLogRepository,
    private readonly judge: SpellingJudge,
    private readonly rule: LevelProgressionRule,
    private readonly deck: DeckService,
    private readonly todayResolver: TodayResolver,
    private readonly clock: Clock,
    private readonly uow: UnitOfWork,
  ) {}

  /**
   * Judges the spelling and returns the answer plus phonetic spelling, without changing any state.
   * The client shows these before asking for the pronunciation self-check; `submit` still re-judges.
   */
  reveal(userId: number, input: RevealInput): RevealResult {
    const { card } = this.loadTarget(userId, input.flashcardId);
    return {
      spellingCorrect: this.judge.isCorrect(input.spellingInput, card.frenchText),
      correctSpelling: card.frenchText,
      phoneticSpelling: card.phoneticSpelling,
    };
  }

  submit(userId: number, input: ReviewInput): ReviewResult {
    return this.uow.run(() => {
      const { today, session, state, card } = this.loadTarget(userId, input.flashcardId);

      const spellingCorrect = this.judge.isCorrect(input.spellingInput, card.frenchText);
      const passed = spellingCorrect && input.pronunciationCorrect;
      const { level: newLevel, requeueAtBack } = this.rule.next(state.level, passed);

      this.cardStates.save(userId, state.flashcardId, newLevel, today);
      if (requeueAtBack) this.cardStates.moveToBack(userId, state.flashcardId);
      this.reviewLog.append(userId, {
        flashcardId: state.flashcardId,
        sessionDate: today,
        cycleDay: session.cycleDay,
        levelBefore: state.level,
        levelAfter: newLevel,
        spellingCorrect,
        pronunciationCorrect: input.pronunciationCorrect,
        passed,
        attemptedAt: this.clock.now(),
      });

      const updated = this.deck.advanceIfEmpty(userId, session);
      return {
        passed,
        spellingCorrect,
        correctSpelling: card.frenchText,
        phoneticSpelling: card.phoneticSpelling,
        newLevel,
        sessionComplete: updated.status === 'complete',
        currentLevel: updated.currentLevel,
      };
    });
  }

  /** Shared guard: an in-progress session today, and a visible card in the level being reviewed. */
  private loadTarget(userId: number, flashcardId: number) {
    const { today } = this.todayResolver.resolve(userId);
    const session = this.sessions.findByDate(userId, today);
    if (!session) throw new NotFoundError("Today's session has not been started");
    if (session.status === 'complete' || session.currentLevel === null) {
      throw new ValidationError("Today's session is already complete");
    }

    const state = this.cardStates.get(userId, flashcardId);
    const card = this.flashcards.findVisible(userId, flashcardId);
    if (!state || !card) throw new NotFoundError('Flashcard not found');
    if (state.level !== session.currentLevel) {
      throw new ValidationError(`Card is not in the level being reviewed (level ${session.currentLevel})`);
    }
    return { today, session, state, card };
  }
}
