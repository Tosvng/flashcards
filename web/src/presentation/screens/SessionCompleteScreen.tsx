import { useNavigate } from 'react-router';
import { AppShell } from '../components/AppShell';
import { Button } from '../components/Button';

export function SessionCompleteScreen() {
  const navigate = useNavigate();
  return (
    <AppShell title="Done" centered>
      <div className="stack center-text">
        <h2 className="title">All done for today!</h2>
        <p className="muted">Every card due today is reviewed. Come back tomorrow to keep learning.</p>
        <Button onClick={() => navigate('/', { replace: true })}>Back to today</Button>
      </div>
    </AppShell>
  );
}
