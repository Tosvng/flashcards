import { useNavigate, useParams } from 'react-router';
import { useMyWords } from '../../application/hooks/useMyWords';
import { useUpdateFlashcard } from '../../application/hooks/useUpdateFlashcard';
import { errorMessage } from '../../domain/errors';
import { AppShell } from '../components/AppShell';
import { CardForm, toFormValues } from '../components/CardForm';
import { ErrorView, LoadingView } from '../components/StateViews';

export function EditCardScreen() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const words = useMyWords();
  const update = useUpdateFlashcard(id);

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
    </AppShell>
  );
}
