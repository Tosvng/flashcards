import { Link, useNavigate } from 'react-router';
import { useMyWords } from '../../application/hooks/useMyWords';
import { errorMessage } from '../../domain/errors';
import { AppShell } from '../components/AppShell';
import { Button } from '../components/Button';
import { ErrorView, LoadingView } from '../components/StateViews';

export function MyWordsScreen() {
  const words = useMyWords();
  const navigate = useNavigate();

  return (
    <AppShell title="My words" backTo="/">
      {words.isPending ? <LoadingView label="Loading your words…" /> : null}
      {words.isError ? <ErrorView message={errorMessage(words.error)} onRetry={() => void words.refetch()} /> : null}
      {words.isSuccess && words.data.length === 0 ? <p className="muted">You haven't added any words yet.</p> : null}
      {words.isSuccess && words.data.length > 0 ? (
        <ul className="word-list">
          {words.data.map((w) => (
            <li key={w.flashcardId}>
              <Link to={`/words/${w.flashcardId}`} className="word-row" aria-label={`Edit ${w.frenchText}`}>
                <span className="big">{w.frenchText}</span>
                <span className="muted">{w.englishTranslation}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <Button variant="secondary" onClick={() => navigate('/add')}>Add a word</Button>
    </AppShell>
  );
}
