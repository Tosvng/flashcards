export interface SpellingJudge {
  isCorrect(input: string, answer: string): boolean;
}

/** Ignores surrounding whitespace and case; accents are significant (é ≠ e). */
export class StrictAccentSpellingJudge implements SpellingJudge {
  isCorrect(input: string, answer: string): boolean {
    return normalize(input) === normalize(answer);
  }
}

function normalize(text: string): string {
  return text.normalize('NFC').trim().toLowerCase();
}
