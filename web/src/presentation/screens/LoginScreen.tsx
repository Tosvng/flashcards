import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../application/auth/AuthProvider';
import { errorMessage } from '../../domain/errors';
import { AppShell } from '../components/AppShell';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !email.trim() || !password) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <AppShell title="Sign in" centered>
      <form className="stack" onSubmit={submit} noValidate>
        <h2 className="title">Welcome back</h2>
        <TextField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" autoCapitalize="none" inputMode="email" />
        <TextField label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
        {error ? <p role="alert" className="error">{error}</p> : null}
        <Button type="submit" loading={busy} disabled={!email.trim() || !password}>Sign in</Button>
        <Link to="/register" className="btn secondary" style={{ textDecoration: 'none' }}>Create an account</Link>
      </form>
    </AppShell>
  );
}
