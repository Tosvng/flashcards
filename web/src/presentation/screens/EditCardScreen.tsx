import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useDeleteFlashcard } from '../../application/hooks/useDeleteFlashcard';
import { useMyWords } from '../../application/hooks/useMyWords';
import { useUpdateFlashcard } from '../../application/hooks/useUpdateFlashcard';
import { errorMessage } from '../../domain/errors';
import { AppShell } from '../components/AppShell';
import { Button } from '../components/Button';
import { CardForm, toFormValues } from '../components/CardForm';
import { ErrorView, LoadingView } from '../components/StateViews';

export function EditCardScreen() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const words = useMyWords();
  const update = useUpdateFlashcard(id);
  const remove = useDeleteFlashcard(id);
  const [confirming, setConfirming] = useState(false);

  if (words.isPending) return <AppShell title="Edit word" backTo="/words"><LoadingView /></AppShell>;
  if (words.isError) {
    return <AppShell title="Edit word" backTo="/words"><ErrorView message={errorMessage(words.error)} onRetry={() => void words.refetch()} /></AppShell>;
  }
  const card = words.data.find((w) => w.flashcardId === id);
  if (!card) return <AppShell title="Edit word" backTo="/words"><p className="muted">That word could not be found.</p></AppShell>;

  return (
    <AppShell title="Edit word" backTo="/words">
      <CardForm
        initial={toFormValues(card)}
        submitLabel="Save changes"
        pending={update.isPending}
        error={update.isError ? update.error : null}
        onSubmit={(c) => update.mutateAsync(c)}
        onSaved={() => navigate('/words')}
      />
      {confirming ? (
        <div className="delete-confirm">
          <p>Delete “{card.frenchText}”? Its review history will be lost too.</p>
          {remove.isError ? <p role="alert" className="error">{errorMessage(remove.error)}</p> : null}
          <div className="button-row">
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={remove.isPending}>Keep word</Button>
            <Button loading={remove.isPending} onClick={() => remove.mutate(undefined, { onSuccess: () => navigate('/words') })}>
              Yes, delete
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setConfirming(true)}>Delete word</Button>
      )}
    </AppShell>
  );
}
