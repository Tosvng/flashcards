import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useReviewFlow } from '../../application/hooks/useReviewFlow';
import { useReviewQueue } from '../../application/hooks/useReviewQueue';
import { compareLetters, isComplete, type LetterMark } from '../../domain/letterSlots';
import type { DeckCard, Level } from '../../domain/types';
import { AppShell } from '../components/AppShell';
import { Button } from '../components/Button';
import { LetterInput } from '../components/LetterInput';
import { LevelBadge } from '../components/LevelBadge';
import { AnswerReveal, PronunciationPrompt } from '../components/PronunciationPrompt';
import { ResultBanner } from '../components/ResultBanner';
import { ReviewCard } from '../components/ReviewCard';
import { ErrorView, LoadingView } from '../components/StateViews';

export function ReviewScreen() {
  const navigate = useNavigate();
  const queue = useReviewQueue();

  useEffect(() => {
    if (queue.status === 'complete') navigate('/done', { replace: true });
  }, [queue.status, navigate]);

  return (
    <AppShell title="Review" backTo="/">
      {queue.status === 'loading' || queue.status === 'complete' ? <LoadingView label="Loading your cards…" /> : null}
      {queue.status === 'error' ? <ErrorView message={queue.message} onRetry={queue.retry} /> : null}
      {queue.status === 'ready' ? (
        <ReviewStep key={queue.attempt} card={queue.card} level={queue.level} remaining={queue.remaining} advance={queue.advance} />
      ) : null}
    </AppShell>
  );
}

interface StepProps {
  card: DeckCard;
  level: Level | null;
  remaining: number;
  advance: () => Promise<string | null>;
}

/** One card, from spelling to result. Remounted (via key) for every card so the reducer starts fresh. */
function ReviewStep({ card, level, remaining, advance }: StepProps) {
  const flow = useReviewFlow(card);
  const { state } = flow;
  const [advancing, setAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  async function next() {
    setAdvancing(true);
    setAdvanceError(null);
    const error = await advance();
    if (error) {
      setAdvanceError(error);
      setAdvancing(false);
    } // on success this component is replaced by the next card
  }

  const spelling = state.phase === 'answering' || state.phase === 'revealing';
  const marks = state.reveal ? compareLetters(state.slots, state.reveal.correctSpelling) : null;

  return (
    <>
      <div className="review-header">
        {level ? <LevelBadge level={level} /> : <span />}
        <span className="muted" aria-label={`${remaining} cards left in this level`}>{remaining} left</span>
      </div>

      <ReviewCard card={card} />

      <LetterInput
        slots={state.slots}
        focusIndex={state.focusIndex}
        editable={state.phase === 'answering'}
        marks={marks ?? undefined}
        onChange={flow.setLetter}
        onBackspace={flow.backspace}
        onSubmit={() => void flow.submitSpelling()}
      />

      {spelling ? (
        <>
          {state.error ? <p role="alert" className="error center-text">{state.error}</p> : null}
          <Button loading={state.phase === 'revealing'} disabled={!isComplete(state.slots)} onClick={() => void flow.submitSpelling()}>
            Check
          </Button>
        </>
      ) : null}

      {state.reveal && marks ? (
        <>
          <AnswerReveal reveal={state.reveal} accentHint={accentHint(marks)} />
          {state.phase === 'result' && state.result ? (
            <ResultBanner result={state.result} loading={advancing} error={advanceError} onContinue={() => void next()} />
          ) : (
            <>
              <PronunciationPrompt disabled={state.phase === 'submitting'} onAnswer={(ok) => void flow.markPronunciation(ok)} />
              {state.error ? <p role="alert" className="error center-text">{state.error} Choose Yes or No to try again.</p> : null}
            </>
          )}
        </>
      ) : null}
    </>
  );
}

/** When the only misses are missing accents, say so: accents are strict, and this is the easy one to overlook. */
function accentHint(marks: readonly LetterMark[]): string | null {
  const misses = marks.filter((m) => m.status !== 'right');
  if (misses.length === 0 || misses.some((m) => m.status === 'wrong')) return null;
  return `Watch the accent${misses.length > 1 ? 's' : ''}: ${misses.map((m) => m.expected).join(', ')}`;
}
