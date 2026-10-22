import { describe, it, expect } from 'vitest';
import { backspaceSlots, compareLetters, emptySlots, isComplete, slotsToText, writeSlots } from '../../src/domain/letterSlots';
import { initialReviewState, reviewReducer, spellingOf, type ReviewEvent, type ReviewState } from '../../src/domain/reviewFlow';
import { levelsLabel, resultMessage, sessionHeadline } from '../../src/domain/sessionLabels';
import { ApiError, errorMessage, isUnauthorized, NetworkError } from '../../src/domain/errors';
import type { DeckCard, ReviewResult, SessionSummary } from '../../src/domain/types';

const card: DeckCard = { flashcardId: 7, photoUrl: 'u', description: 'd', letterCount: 3 };
const reveal = { spellingCorrect: true, correctSpelling: 'été', phoneticSpelling: '/ete/' };
const result: ReviewResult = { ...reveal, passed: true, newLevel: 2, sessionComplete: false, currentLevel: 1 };

const run = (state: ReviewState, ...events: ReviewEvent[]) => events.reduce(reviewReducer, state);
const typed = (...letters: string[]): ReviewEvent[] => letters.map((text, index) => ({ type: 'LETTER_CHANGED', index, text }));

describe('letterSlots', () => {
  it('writes single characters, including accents', () => {
    const { slots, focusIndex } = writeSlots(emptySlots(3), 0, 'é');
    expect(slots).toEqual(['é', '', '']);
    expect(focusIndex).toBe(1);
  });
  it('keeps focus on the last box when the final letter is typed', () => {
    expect(writeSlots(emptySlots(3), 2, 'x').focusIndex).toBe(2);
  });
  it('spreads pasted text across following boxes and truncates the overflow', () => {
    expect(writeSlots(emptySlots(3), 1, 'abc').slots).toEqual(['', 'a', 'b']);
    expect(slotsToText(writeSlots(emptySlots(4), 0, 'été!!').slots)).toBe('été!');
  });
  it('normalizes decomposed accents to one character', () => {
    expect(writeSlots(emptySlots(3), 0, 'été').slots).toEqual(['é', 't', 'é']);
  });
  it('ignores newlines and out-of-range indexes', () => {
    expect(writeSlots(emptySlots(2), 0, 'a\nb').slots).toEqual(['a', 'b']);
    const slots = emptySlots(2);
    expect(writeSlots(slots, 5, 'a').slots).toBe(slots);
  });
  it('clears a box when given empty text', () => {
    expect(writeSlots(['a', 'b'], 1, '').slots).toEqual(['a', '']);
  });
  it('backspace clears the current box, or the previous one when already empty', () => {
    expect(backspaceSlots(['a', 'b', ''], 1)).toEqual({ slots: ['a', '', ''], focusIndex: 1 });
    expect(backspaceSlots(['a', 'b', ''], 2)).toEqual({ slots: ['a', '', ''], focusIndex: 1 });
    expect(backspaceSlots(['', ''], 0)).toEqual({ slots: ['', ''], focusIndex: 0 });
  });
  it('knows when every box is filled', () => {
    expect(isComplete(['a', ''])).toBe(false);
    expect(isComplete(['a', 'b'])).toBe(true);
    expect(isComplete([])).toBe(false);
  });
});

describe('reviewReducer', () => {
  const start = initialReviewState(card);

  it('starts in answering with empty boxes', () => {
    expect(start).toMatchObject({ phase: 'answering', slots: ['', '', ''], focusIndex: 0, error: null });
  });

  it('will not submit an incomplete spelling', () => {
    expect(run(start, ...typed('a', 'b'), { type: 'SUBMIT_SPELLING' }).phase).toBe('answering');
  });

  it('walks the happy path: answer → reveal → pronounce → result', () => {
    let s = run(start, ...typed('é', 't', 'é'), { type: 'SUBMIT_SPELLING' });
    expect(s.phase).toBe('revealing');
    expect(spellingOf(s)).toBe('été');
    s = run(s, { type: 'REVEAL_OK', reveal });
    expect(s).toMatchObject({ phase: 'revealed', reveal });
    s = run(s, { type: 'MARK_PRONUNCIATION', correct: true });
    expect(s).toMatchObject({ phase: 'submitting', pronunciationCorrect: true });
    s = run(s, { type: 'SAVED', result });
    expect(s).toMatchObject({ phase: 'result', result });
  });

  it('still reveals after a wrong spelling (the user must see the answer)', () => {
    const s = run(start, ...typed('x', 'y', 'z'), { type: 'SUBMIT_SPELLING' }, { type: 'REVEAL_OK', reveal: { ...reveal, spellingCorrect: false } });
    expect(s.phase).toBe('revealed');
    expect(s.reveal?.spellingCorrect).toBe(false);
  });

  it('returns to the previous phase with an error when a request fails', () => {
    const revealing = run(start, ...typed('a', 'b', 'c'), { type: 'SUBMIT_SPELLING' });
    const back = run(revealing, { type: 'REVEAL_FAILED', message: 'offline' });
    expect(back).toMatchObject({ phase: 'answering', error: 'offline' });
    expect(back.slots).toEqual(['a', 'b', 'c']); // typing is kept

    const submitting = run(revealing, { type: 'REVEAL_OK', reveal }, { type: 'MARK_PRONUNCIATION', correct: false });
    const retry = run(submitting, { type: 'SAVE_FAILED', message: 'boom' });
    expect(retry).toMatchObject({ phase: 'revealed', error: 'boom', pronunciationCorrect: null });
  });

  it('clears the error when the user edits again', () => {
    const failed = run(start, { type: 'REVEAL_FAILED', message: 'x' });
    expect(failed.error).toBeNull(); // not revealing, so ignored
    const withError: ReviewState = { ...start, error: 'offline' };
    expect(run(withError, ...typed('a')).error).toBeNull();
  });

  it('ignores events that are illegal in the current phase', () => {
    expect(run(start, { type: 'MARK_PRONUNCIATION', correct: true })).toBe(start);
    expect(run(start, { type: 'SAVED', result })).toBe(start);
    const revealing = run(start, ...typed('a', 'b', 'c'), { type: 'SUBMIT_SPELLING' });
    expect(run(revealing, ...typed('z'))).toBe(revealing); // inputs are locked
    expect(run(revealing, { type: 'SUBMIT_SPELLING' })).toBe(revealing);
    const done = run(revealing, { type: 'REVEAL_OK', reveal }, { type: 'MARK_PRONUNCIATION', correct: true }, { type: 'SAVED', result });
    expect(run(done, { type: 'MARK_PRONUNCIATION', correct: false })).toBe(done);
  });

  it('RESET starts a fresh card from any phase', () => {
    const next: DeckCard = { ...card, flashcardId: 8, letterCount: 5 };
    const s = run(start, ...typed('a', 'b', 'c'), { type: 'RESET', card: next });
    expect(s).toEqual(initialReviewState(next));
    expect(s.slots).toHaveLength(5);
  });

  it('handles backspace while answering', () => {
    const s = run(start, ...typed('a', 'b'), { type: 'BACKSPACE', index: 1 });
    expect(s.slots).toEqual(['a', '', '']);
  });
});

describe('sessionLabels', () => {
  const summary: SessionSummary = {
    started: false, sessionDate: '2026-01-01', cycleDay: 59, levelsDue: [6, 3, 2, 1], isCatchUp: true,
    newCardsAdded: 10, skipNewCards: false, currentLevel: 6, status: 'not_started',
  };
  it('labels levels', () => {
    expect(levelsLabel([6, 3, 2, 1])).toBe('Levels 6 · 3 · 2 · 1');
    expect(levelsLabel([1])).toBe('Level 1');
    expect(levelsLabel([])).toBe('No levels due');
  });
  it('writes the headline', () => {
    expect(sessionHeadline(summary)).toBe('Catch-up day');
    expect(sessionHeadline({ ...summary, isCatchUp: false })).toBe('Day 59 of 64');
    expect(sessionHeadline({ ...summary, status: 'complete' })).toBe('All done for today');
  });
  it('explains results', () => {
    expect(resultMessage(result)).toBe('Moved up to level 2');
    expect(resultMessage({ ...result, newLevel: 8 })).toMatch(/Completed/);
    expect(resultMessage({ ...result, passed: false, spellingCorrect: false, newLevel: 1 })).toMatch(/Not quite/);
    expect(resultMessage({ ...result, passed: false, spellingCorrect: true, newLevel: 1 })).toMatch(/Pronunciation/);
  });
});

describe('errors', () => {
  it('detects unauthorized responses', () => {
    expect(isUnauthorized(new ApiError(401, 'UNAUTHORIZED', 'x'))).toBe(true);
    expect(isUnauthorized(new ApiError(404, 'NOT_FOUND', 'x'))).toBe(false);
    expect(isUnauthorized(new Error('x'))).toBe(false);
  });
  it('gives safe user-facing messages', () => {
    expect(errorMessage(new ApiError(400, 'VALIDATION', 'bad email'))).toBe('bad email');
    expect(errorMessage(new NetworkError())).toMatch(/connection/);
    expect(errorMessage(new TypeError('secret internals'))).toBe('Something went wrong. Please try again.');
  });
});

describe('compareLetters', () => {
  it('marks right, wrong and accent-only misses (case ignored, accents strict)', () => {
    expect(compareLetters(['E', 't', 'a'], 'été')).toEqual([
      { status: 'accent', expected: 'é' },
      { status: 'right', expected: 't' },
      { status: 'wrong', expected: 'é' },
    ]);
  });

  it('treats a matching word as all right', () => {
    expect(compareLetters(['c', 'h', 'a', 't'], 'Chat').every((m) => m.status === 'right')).toBe(true);
  });
});
