import { useState, type FormEvent, type ReactNode } from 'react';
import { errorMessage } from '../../domain/errors';
import type { NewFlashcard } from '../../domain/types';
import { Button } from './Button';
import { TextField } from './TextField';

export interface CardFormValues {
  frenchText: string;
  englishTranslation: string;
  photoUrl: string;
  description: string;
  phoneticSpelling: string;
}
type Form = CardFormValues;

export const emptyCardForm: Form = { frenchText: '', englishTranslation: '', photoUrl: '', description: '', phoneticSpelling: '' };

export const toFormValues = (c: NewFlashcard): Form => ({ ...c, phoneticSpelling: c.phoneticSpelling ?? '' });

export function validateCard(f: Form): Partial<Record<keyof Form, string>> {
  const errors: Partial<Record<keyof Form, string>> = {};
  if (!f.frenchText.trim()) errors.frenchText = 'Enter the French word';
  if (!f.englishTranslation.trim()) errors.englishTranslation = 'Enter the English translation';
  if (!f.description.trim()) errors.description = 'Describe the word without using it';
  if (!/^https?:\/\/\S+$/i.test(f.photoUrl.trim())) errors.photoUrl = 'Enter an image link starting with http:// or https://';
  return errors;
}

interface Props {
  initial?: Form;
  submitLabel: string;
  pending: boolean;
  error: unknown;
  /** Resolves once saved; a rejection keeps the form as typed (the error is shown from `error`). */
  onSubmit: (card: NewFlashcard) => Promise<unknown>;
  /** Called after a successful save, e.g. to clear the form or leave the screen. */
  onSaved?: (card: NewFlashcard) => void;
  /** Reset the form to empty after a save. */
  resetOnSave?: boolean;
  /** Shown below the fields (e.g. a success message). */
  notice?: ReactNode;
  /** Called whenever a field changes. */
  onEdit?: () => void;
}

export function CardForm({ initial = emptyCardForm, submitLabel, pending, error, onSubmit, onSaved, resetOnSave = false, notice, onEdit }: Props) {
  const [form, setForm] = useState<Form>(initial);
  const [touched, setTouched] = useState(false);
  const problems = validateCard(form);
  const set = (key: keyof Form) => (value: string) => {
    onEdit?.();
    setForm((f) => ({ ...f, [key]: value }));
  };
  const show = (key: keyof Form) => (touched ? problems[key] ?? null : null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(problems).length > 0) return;
    const card: NewFlashcard = {
      frenchText: form.frenchText.trim(),
      englishTranslation: form.englishTranslation.trim(),
      photoUrl: form.photoUrl.trim(),
      description: form.description.trim(),
      phoneticSpelling: form.phoneticSpelling.trim() || null,
    };
    try {
      await onSubmit(card);
    } catch {
      return; // shown from `error`
    }
    if (resetOnSave) {
      setForm(emptyCardForm);
      setTouched(false);
    }
    onSaved?.(card);
  }

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <TextField label="French word" value={form.frenchText} onChange={set('frenchText')} autoCapitalize="none" error={show('frenchText')} />
      <TextField label="English translation" value={form.englishTranslation} onChange={set('englishTranslation')} error={show('englishTranslation')} />
      <TextField label="Description (without the word)" value={form.description} onChange={set('description')} multiline error={show('description')} />
      <TextField label="Image link" type="url" value={form.photoUrl} onChange={set('photoUrl')} autoCapitalize="none" inputMode="url" error={show('photoUrl')} />
      <TextField label="Phonetic spelling (optional)" value={form.phoneticSpelling} onChange={set('phoneticSpelling')} autoCapitalize="none" />
      {error ? <p role="alert" className="error">{errorMessage(error)}</p> : null}
      {notice}
      <Button type="submit" loading={pending}>{submitLabel}</Button>
    </form>
  );
}
