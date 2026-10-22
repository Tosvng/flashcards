import { useState, type FormEvent } from 'react';
import { useAddFlashcard } from '../../application/hooks/useAddFlashcard';
import { errorMessage } from '../../domain/errors';
import { AppShell } from '../components/AppShell';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';

const empty = { frenchText: '', englishTranslation: '', photoUrl: '', description: '', phoneticSpelling: '' };
type Form = typeof empty;

export function validateCard(f: Form): Partial<Record<keyof Form, string>> {
  const errors: Partial<Record<keyof Form, string>> = {};
  if (!f.frenchText.trim()) errors.frenchText = 'Enter the French word';
  if (!f.englishTranslation.trim()) errors.englishTranslation = 'Enter the English translation';
  if (!f.description.trim()) errors.description = 'Describe the word without using it';
  if (!/^https?:\/\/\S+$/i.test(f.photoUrl.trim())) errors.photoUrl = 'Enter an image link starting with http:// or https://';
  return errors;
}

export function AddCardScreen() {
  const add = useAddFlashcard();
  const [form, setForm] = useState<Form>(empty);
  const [touched, setTouched] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  const problems = validateCard(form);
  const set = (key: keyof Form) => (value: string) => {
    setAdded(null);
    setForm((f) => ({ ...f, [key]: value }));
  };
  const show = (key: keyof Form) => (touched ? problems[key] ?? null : null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(problems).length > 0) return;
    try {
      await add.mutateAsync({
        frenchText: form.frenchText.trim(),
        englishTranslation: form.englishTranslation.trim(),
        photoUrl: form.photoUrl.trim(),
        description: form.description.trim(),
        phoneticSpelling: form.phoneticSpelling.trim() || null,
      });
      setAdded(form.frenchText.trim());
      setForm(empty);
      setTouched(false);
    } catch {
      /* shown from add.error below */
    }
  }

  return (
    <AppShell title="Add a word" backTo="/">
      <form className="stack" onSubmit={submit} noValidate>
        <TextField label="French word" value={form.frenchText} onChange={set('frenchText')} autoCapitalize="none" error={show('frenchText')} />
        <TextField label="English translation" value={form.englishTranslation} onChange={set('englishTranslation')} error={show('englishTranslation')} />
        <TextField label="Description (without the word)" value={form.description} onChange={set('description')} multiline error={show('description')} />
        <TextField label="Image link" type="url" value={form.photoUrl} onChange={set('photoUrl')} autoCapitalize="none" inputMode="url" error={show('photoUrl')} />
        <TextField label="Phonetic spelling (optional)" value={form.phoneticSpelling} onChange={set('phoneticSpelling')} autoCapitalize="none" />
        {add.isError ? <p role="alert" className="error">{errorMessage(add.error)}</p> : null}
        {added ? <p role="status" className="success">Added "{added}". It will join your new cards.</p> : null}
        <Button type="submit" loading={add.isPending}>Add word</Button>
      </form>
    </AppShell>
  );
}
