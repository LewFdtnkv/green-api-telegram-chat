import { useQuery } from '@tanstack/react-query';
import { greenApi } from '../../../shared/api/greenApi';

export const telegramQueryKeys = {
  session: ['telegram', 'session'] as const,
  updates: ['telegram', 'updates'] as const
};

export function useTelegramSession(enabled: boolean) {
  return useQuery({
    queryKey: telegramQueryKeys.session,
    queryFn: greenApi.getSession,
    enabled,
    staleTime: 5 * 60 * 1000
  });
}

export function useTelegramUpdates(enabled: boolean) {
  return useQuery({
    queryKey: telegramQueryKeys.updates,
    queryFn: greenApi.getUpdates,
    enabled,
    retry: false,
    refetchInterval: (query) => query.state.error ? false : 6000,
    refetchIntervalInBackground: false
  });
}
