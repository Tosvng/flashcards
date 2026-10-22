import { resultMessage } from '../../domain/sessionLabels';
import type { ReviewResult } from '../../domain/types';
import { Button } from './Button';
import { CheckMark, CrossMark } from './Marks';

interface Props {
  result: ReviewResult;
  loading: boolean;
  error: string | null;
  onContinue: () => void;
}

/** Takes the place of the pronunciation question, in the same spot, so the thumb does not move. */
export function ResultBanner({ result, loading, error, onContinue }: Props) {
  return (
    <section className={`action-zone result ${result.passed ? 'passed' : 'failed'}`} aria-label="Result">
      <div className="action-copy">
        <p className="verdict" role="status">
          {result.passed ? <CheckMark /> : <CrossMark />}
          {result.passed ? 'Passed' : 'Not passed'}
        </p>
        <p className="muted">{resultMessage(result)}</p>
      </div>
      {error ? <p role="alert" className="error">{error}</p> : null}
      <Button onClick={onContinue} loading={loading} autoFocus>{result.sessionComplete ? 'Finish' : 'Next card'}</Button>
    </section>
  );
}
