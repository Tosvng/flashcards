import { useEffect, useRef } from 'react';
import type { RevealResult } from '../../domain/types';
import { Button } from './Button';
import { PlayPronunciationButton } from './PlayPronunciationButton';
import { CheckMark, CrossMark } from './Marks';

/** The reveal: spelling verdict, the correct word, its phonetics, and a note when only an accent was missed. */
export function AnswerReveal({ reveal, accentHint }: { reveal: RevealResult; accentHint?: string | null }) {
  const ref = useRef<HTMLElement>(null);
  // The letter boxes just became read-only, so keyboard focus would fall back to the page: park it on the answer.
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  return (
    <section ref={ref} tabIndex={-1} className="reveal" aria-label="Answer">
      <p className={`verdict-pill ${reveal.spellingCorrect ? 'ok' : 'bad'}`} role="status">
        {reveal.spellingCorrect ? <CheckMark /> : <CrossMark />}
        {reveal.spellingCorrect ? 'Spelling correct' : 'Spelling incorrect'}
      </p>
      <p className="answer" lang="fr" aria-label={`Correct spelling: ${reveal.correctSpelling}`}>{reveal.correctSpelling}</p>
      {reveal.phoneticSpelling ? (
        <p className="phonetic" aria-label={`Phonetic spelling: ${reveal.phoneticSpelling}`}>{reveal.phoneticSpelling}</p>
      ) : null}
      <PlayPronunciationButton text={reveal.correctSpelling} />
      {accentHint ? <p className="accent-hint">{accentHint}</p> : null}
    </section>
  );
}

interface Props {
  disabled: boolean;
  onAnswer: (pronouncedCorrectly: boolean) => void;
}

/** After the reveal: the pronunciation self-check that decides whether the card passes. */
export function PronunciationPrompt({ disabled, onAnswer }: Props) {
  return (
    <section className="action-zone" aria-label="Pronunciation">
      <p className="action-copy">Say it out loud. Did you pronounce it correctly?</p>
      <div className="button-row">
        <Button onClick={() => onAnswer(true)} disabled={disabled}>Yes</Button>
        <Button variant="secondary" onClick={() => onAnswer(false)} disabled={disabled}>No</Button>
      </div>
    </section>
  );
}
