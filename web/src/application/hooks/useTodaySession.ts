import { useQuery } from '@tanstack/react-query';
import { keys } from '../queryKeys';
import { useServices } from '../ServicesContext';

export function useTodaySession() {
  const { session } = useServices();
  return useQuery({
    queryKey: keys.session,
    queryFn: () => session.today(),
    // On the web, returning to a tab/PWA left open overnight must not show yesterday's session.
    // (Native apps have no window focus events, so this is a no-op there.)
    refetchOnWindowFocus: true,
  });
}
