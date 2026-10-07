import type { TelegramBot, TelegramMessage, TelegramUpdate } from '../../entities/telegram/model/types';

async function request<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json() as T & { error?: string };

  if (!response.ok) throw new Error(data.error || 'Не удалось выполнить запрос.');
  return data;
}

export const telegramApi = {
  getProfile: (token: string) => request<TelegramBot>('/api/telegram/profile', { token }),
  getUpdates: (token: string, offset: number | null) => request<TelegramUpdate[]>('/api/telegram/updates', { token, offset }),
  sendMessage: (token: string, chatId: string | number, text: string) => request<TelegramMessage>('/api/telegram/send', { token, chatId, text })
};
