import { useQuery } from '@tanstack/react-query';
import { greenApi } from '../../../shared/api/greenApi';

const UPDATE_POLL_INTERVAL_MS = 1_000;
const CHAT_LIST_SYNC_INTERVAL_MS = 60_000;

export const telegramQueryKeys = {
  session: ['telegram', 'session'] as const,
  chats: ['telegram', 'chats'] as const,
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

export function useTelegramChats(enabled: boolean) {
  return useQuery({
    queryKey: telegramQueryKeys.chats,
    queryFn: greenApi.getChats,
    enabled,
    staleTime: CHAT_LIST_SYNC_INTERVAL_MS,
    refetchInterval: CHAT_LIST_SYNC_INTERVAL_MS,
    refetchIntervalInBackground: false
  });
}

export function useTelegramUpdates(enabled: boolean) {
  return useQuery({
    queryKey: telegramQueryKeys.updates,
    queryFn: greenApi.getUpdates,
    enabled,
    retry: false,
    refetchInterval: (query) => query.state.error ? false : UPDATE_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false
  });
}
