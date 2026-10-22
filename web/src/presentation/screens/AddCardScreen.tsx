import { useState } from 'react';
import { useAddFlashcard } from '../../application/hooks/useAddFlashcard';
import { AppShell } from '../components/AppShell';
import { CardForm } from '../components/CardForm';

export function AddCardScreen() {
  const add = useAddFlashcard();
  const [added, setAdded] = useState<string | null>(null);

  return (
    <AppShell title="Add a word" backTo="/">
      <CardForm
        submitLabel="Add word"
        pending={add.isPending}
        error={add.isError ? add.error : null}
        onSubmit={(card) => add.mutateAsync(card)}
        onSaved={(card) => setAdded(card.frenchText)}
        onEdit={() => setAdded(null)}
        resetOnSave
        notice={added ? <p role="status" className="success">Added "{added}". It will join your new cards.</p> : null}
      />
    </AppShell>
  );
}
