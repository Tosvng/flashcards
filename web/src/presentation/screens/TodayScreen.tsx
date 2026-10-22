import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../application/auth/AuthProvider';
import { useStartSession } from '../../application/hooks/useStartSession';
import { useTodaySession } from '../../application/hooks/useTodaySession';
import { errorMessage } from '../../domain/errors';
import { levelsLabel, sessionHeadline } from '../../domain/sessionLabels';
import { AppShell } from '../components/AppShell';
import { Button } from '../components/Button';
import { CatchUpNotice } from '../components/CatchUpNotice';
import { ErrorView, LoadingView } from '../components/StateViews';

const cards = (n: number) => `${n} new ${n === 1 ? 'card' : 'cards'}`;

export function TodayScreen() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const today = useTodaySession();
  const start = useStartSession();
  const [skipNew, setSkipNew] = useState(false);

  if (today.isPending) return <AppShell title="Flashcards"><LoadingView label="Loading today's session…" /></AppShell>;
  if (today.isError) {
    return <AppShell title="Flashcards"><ErrorView message={errorMessage(today.error)} onRetry={() => void today.refetch()} /></AppShell>;
  }

  const s = today.data;
  const complete = s.status === 'complete';
  const inProgress = s.status === 'in_progress';

  async function begin() {
    const started = await start.mutateAsync(skipNew).catch(() => null);
    if (started && started.status !== 'complete') navigate('/review');
  }

  return (
    <AppShell title="Flashcards">
      <h2 className="title">{sessionHeadline(s)}</h2>

      {complete ? (
        <p className="muted">You have finished today's review. See you tomorrow!</p>
      ) : (
        <div className="facts">
          <p className="big">{levelsLabel(s.levelsDue)}</p>
          <p className="muted">
            {s.started ? `${cards(s.newCardsAdded)} added today` : s.skipNewCards ? 'No new cards today' : `${cards(s.newCardsAdded)} will be added`}
          </p>
        </div>
      )}

      {!s.started && s.isCatchUp ? <CatchUpNotice levelsDue={s.levelsDue} skipNewCards={skipNew} onChangeSkip={setSkipNew} /> : null}

      {!s.started && s.newCardsAdded === 0 ? (
        <p className="muted small">You have no new words waiting. Add your own words to keep learning.</p>
      ) : null}

      {start.isError ? <p role="alert" className="error">{errorMessage(start.error)}</p> : null}

      {!complete ? (
        <Button loading={start.isPending} onClick={inProgress ? () => navigate('/review') : () => void begin()}>
          {inProgress ? 'Continue reviewing' : 'Start review'}
        </Button>
      ) : null}
      <Button variant="secondary" onClick={() => navigate('/add')}>Add a word</Button>
      <Button variant="secondary" onClick={() => navigate('/words')}>My words</Button>
      <Button variant="secondary" onClick={() => void signOut()}>Sign out</Button>
    </AppShell>
  );
}
