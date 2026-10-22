import { describe, it, expect, type Mock } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAuth } from '../../src/application/auth/AuthProvider';
import { ApiError } from '../../src/domain/errors';
import { createFakeServices, makeWrapper } from '../fakes';

async function setup(initialToken: string | null = null) {
  const services = createFakeServices();
  if (initialToken) await services.tokenStore.set(initialToken);
  const { wrapper, queryClient } = makeWrapper(services, { auth: true });
  const hook = await renderHook(() => useAuth(), { wrapper });
  return { services, queryClient, ...hook };
}

describe('AuthProvider', () => {
  it('starts signed out when there is no stored token', async () => {
    const { result } = await setup();
    await waitFor(() => expect(result.current.status).toBe('signedOut'));
  });

  it('restores a stored token on launch', async () => {
    const { result } = await setup('stored');
    await waitFor(() => expect(result.current.status).toBe('signedIn'));
  });

  it('signs in: calls login, stores the token', async () => {
    const { result, services } = await setup();
    await waitFor(() => expect(result.current.status).toBe('signedOut'));
    await act(() => result.current.signIn('a@b.co', 'password1'));
    expect(services.auth.login).toHaveBeenCalledWith('a@b.co', 'password1');
    expect(await services.tokenStore.get()).toBe('tok-login');
    expect(result.current.status).toBe('signedIn');
  });

  it('does not store a token or sign in when login fails, and rethrows', async () => {
    const { result, services } = await setup();
    await waitFor(() => expect(result.current.status).toBe('signedOut'));
    (services.auth.login as Mock).mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'Invalid email or password'));
    await expect(act(() => result.current.signIn('a@b.co', 'bad'))).rejects.toThrow('Invalid email or password');
    expect(await services.tokenStore.get()).toBeNull();
    expect(result.current.status).toBe('signedOut');
  });

  it('signs up with the device time zone', async () => {
    const { result, services } = await setup();
    await waitFor(() => expect(result.current.status).toBe('signedOut'));
    await act(() => result.current.signUp('a@b.co', 'password1'));
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(services.auth.register).toHaveBeenCalledWith('a@b.co', 'password1', tz);
    expect(await services.tokenStore.get()).toBe('tok-register');
  });

  it('signs out: clears the token AND the query cache', async () => {
    const { result, services, queryClient } = await setup('stored');
    await waitFor(() => expect(result.current.status).toBe('signedIn'));
    queryClient.setQueryData(['session', 'today'], { secret: 'previous user' });
    await act(() => result.current.signOut());
    expect(await services.tokenStore.get()).toBeNull();
    expect(queryClient.getQueryData(['session', 'today'])).toBeUndefined();
    expect(result.current.status).toBe('signedOut');
  });

  it('forces sign-out when the server reports an expired session', async () => {
    const { result, services } = await setup('stored');
    await waitFor(() => expect(result.current.status).toBe('signedIn'));
    await act(async () => services.signal.notify());
    await waitFor(() => expect(result.current.status).toBe('signedOut'));
    expect(await services.tokenStore.get()).toBeNull();
  });

  it('falls back to signed out if the secure store throws', async () => {
    const services = createFakeServices({ tokens: { get: async () => { throw new Error('keychain'); }, set: async () => {}, clear: async () => {} } });
    const { wrapper } = makeWrapper(services, { auth: true });
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('signedOut'));
  });
});
