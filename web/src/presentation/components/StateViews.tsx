import { Button } from './Button';

export function LoadingView({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="state-view" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span className="muted">{label}</span>
    </div>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-view">
      <p role="alert" className="error">{message}</p>
      {onRetry ? <Button onClick={onRetry}>Try again</Button> : null}
    </div>
  );
}
