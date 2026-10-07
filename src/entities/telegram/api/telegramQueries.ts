import { useQuery } from '@tanstack/react-query';
import { telegramApi } from '../../../shared/api/telegram';

export const telegramQueryKeys = {
  session: ['telegram', 'session'] as const,
  updates: ['telegram', 'updates'] as const,
  updatesByOffset: (offset: number | null) => [...telegramQueryKeys.updates, offset] as const
};

export function useTelegramSession(enabled: boolean) {
  return useQuery({
    queryKey: telegramQueryKeys.session,
    queryFn: telegramApi.getSession,
    enabled,
    staleTime: 5 * 60 * 1000
  });
}

export function useTelegramUpdates(offset: number | null, enabled: boolean) {
  return useQuery({
    queryKey: telegramQueryKeys.updatesByOffset(offset),
    queryFn: () => telegramApi.getUpdates(offset),
    enabled,
    refetchInterval: 3000,
    refetchIntervalInBackground: false
  });
}
