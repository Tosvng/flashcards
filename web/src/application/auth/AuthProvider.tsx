import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useServices } from '../ServicesContext';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export interface AuthApi {
  status: AuthStatus;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthApi | null>(null);

const deviceTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth, tokens, sessionExpired } = useServices();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    tokens
      .get()
      .then((token) => !cancelled && setStatus(token ? 'signedIn' : 'signedOut'))
      .catch(() => !cancelled && setStatus('signedOut'));
    return () => {
      cancelled = true;
    };
  }, [tokens]);

  const signOut = useCallback(async () => {
    await tokens.clear();
    // One user's data must never show for the next user.
    queryClient.clear();
    setStatus('signedOut');
  }, [tokens, queryClient]);

  useEffect(() => sessionExpired.subscribe(() => void signOut()), [sessionExpired, signOut]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { token } = await auth.login(email, password);
      await tokens.set(token);
      setStatus('signedIn');
    },
    [auth, tokens],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      const { token } = await auth.register(email, password, deviceTimeZone());
      await tokens.set(token);
      setStatus('signedIn');
    },
    [auth, tokens],
  );

  const value = useMemo(() => ({ status, signIn, signUp, signOut }), [status, signIn, signUp, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
