/** Immutable helpers for the one-box-per-letter spelling input. Each slot holds '' or one character. */
export type Slots = readonly string[];

export interface SlotEdit {
  slots: Slots;
  /** Which box should receive focus next. */
  focusIndex: number;
}

export const emptySlots = (count: number): Slots => Array.from({ length: Math.max(0, count) }, () => '');

const chars = (text: string): string[] => Array.from(text.normalize('NFC')).filter((c) => c !== '\n' && c !== '\r');

/**
 * Writes `text` into the slots starting at `index`. A single character fills one box;
 * longer text (paste) spreads across the following boxes and is cut off at the end.
 * Empty text clears the box. Handles accented characters as single characters.
 */
export function writeSlots(slots: Slots, index: number, text: string): SlotEdit {
  if (index < 0 || index >= slots.length) return { slots, focusIndex: index };
  const incoming = chars(text);
  if (incoming.length === 0) {
    return { slots: slots.map((s, i) => (i === index ? '' : s)), focusIndex: index };
  }
  const next = [...slots];
  let i = index;
  for (const ch of incoming) {
    if (i >= next.length) break;
    next[i++] = ch;
  }
  return { slots: next, focusIndex: Math.min(i, next.length - 1) };
}

/** Backspace: clears the box; if it is already empty, clears and focuses the previous box. */
export function backspaceSlots(slots: Slots, index: number): SlotEdit {
  if (index < 0 || index >= slots.length) return { slots, focusIndex: index };
  if (slots[index] !== '') {
    return { slots: slots.map((s, i) => (i === index ? '' : s)), focusIndex: index };
  }
  const prev = Math.max(0, index - 1);
  return { slots: slots.map((s, i) => (i === prev ? '' : s)), focusIndex: prev };
}

export const slotsToText = (slots: Slots): string => slots.join('');

export const isComplete = (slots: Slots): boolean => slots.length > 0 && slots.every((s) => s !== '');

export type LetterStatus = 'right' | 'wrong' | 'accent';

export interface LetterMark {
  status: LetterStatus;
  /** The letter that belonged in this box. */
  expected: string;
}

const baseLetter = (c: string): string => c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Compares what was typed with the correct spelling, box by box, the way the server judges it:
 * case is ignored, accents are strict. A miss that differs only by its accent is reported as
 * 'accent' so the UI can say so.
 */
export function compareLetters(typed: Slots, correct: string): LetterMark[] {
  const expected = chars(correct);
  return typed.map((letter, i) => {
    const want = expected[i] ?? '';
    if (letter.toLowerCase() === want.toLowerCase()) return { status: 'right', expected: want };
    return { status: want !== '' && baseLetter(letter) === baseLetter(want) ? 'accent' : 'wrong', expected: want };
  });
}
