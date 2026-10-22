import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../application/auth/AuthProvider';
import { errorMessage } from '../../domain/errors';
import { AppShell } from '../components/AppShell';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mirrors the backend's rules so most mistakes are caught before a round trip. */
export function validateRegistration(email: string, password: string): { email?: string; password?: string } {
  const errors: { email?: string; password?: string } = {};
  if (!EMAIL.test(email.trim())) errors.email = 'Enter a valid email address';
  if (password.length < 8) errors.password = 'Use at least 8 characters';
  return errors;
}

export function RegisterScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const problems = validateRegistration(email, password);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (busy || problems.email || problems.password) return;
    setBusy(true);
    setError(null);
    try {
      await signUp(email.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <AppShell title="Create account" backTo="/login" centered>
      <form className="stack" onSubmit={submit} noValidate>
        <h2 className="title">Create your account</h2>
        <TextField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" autoCapitalize="none" inputMode="email" error={touched ? problems.email : null} />
        <TextField label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" error={touched ? problems.password : null} />
        {error ? <p role="alert" className="error">{error}</p> : null}
        <Button type="submit" loading={busy}>Create account</Button>
        <Link to="/login" className="btn secondary" style={{ textDecoration: 'none' }}>I already have an account</Link>
      </form>
    </AppShell>
  );
}
