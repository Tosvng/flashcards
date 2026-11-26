import type { ButtonHTMLAttributes } from 'react';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: 'primary' | 'secondary';
  /** Defaults to 'button' so a button inside a form never submits by accident. */
  type?: 'button' | 'submit';
  loading?: boolean;
}

export function Button({ variant = 'primary', type = 'button', loading = false, disabled, children, className, ...rest }: Props) {
  return (
    <button
      type={type}
      className={['btn', variant === 'secondary' ? 'secondary' : '', className ?? ''].filter(Boolean).join(' ')}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
