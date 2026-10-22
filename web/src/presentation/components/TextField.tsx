import { useId, type HTMLInputTypeAttribute, type HTMLAttributes } from 'react';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  type?: HTMLInputTypeAttribute;
  multiline?: boolean;
  autoComplete?: string;
  autoCapitalize?: 'none' | 'sentences';
  inputMode?: HTMLAttributes<HTMLElement>['inputMode'];
  required?: boolean;
}

/** Labelled input (or textarea). The label is a real <label>, so it names the field for assistive tech. */
export function TextField({ label, value, onChange, error, type = 'text', multiline = false, autoComplete, autoCapitalize, inputMode, required }: Props) {
  const id = useId();
  const errorId = `${id}-error`;
  const common = {
    id,
    value,
    required,
    autoComplete,
    autoCapitalize,
    inputMode,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
  } as const;
  return (
    <div className={`field${error ? ' invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea {...common} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input {...common} type={type} onChange={(e) => onChange(e.target.value)} />
      )}
      {error ? <p id={errorId} role="alert" className="error">{error}</p> : null}
    </div>
  );
}
