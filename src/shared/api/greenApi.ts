import type { GreenApiInstance, TelegramMessage, TelegramUpdate } from '../../entities/telegram/model/types';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, method: 'GET' | 'POST' = 'GET', payload?: Record<string, unknown>): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: payload ? { 'content-type': 'application/json' } : undefined,
    body: payload ? JSON.stringify(payload) : undefined
  });
  const data = response.status === 204
    ? null
    : await response.json() as T & { error?: string };

  if (!response.ok) {
    throw new ApiError(response.status, (data as { error?: string } | null)?.error || 'Не удалось выполнить запрос.');
  }

  return data as T;
}

export const greenApi = {
  connect: (apiUrl: string, idInstance: string, apiTokenInstance: string) => request<GreenApiInstance>('/api/green-api/connect', 'POST', { apiUrl, idInstance, apiTokenInstance }),
  getSession: () => request<GreenApiInstance>('/api/green-api/session'),
  getUpdates: () => request<TelegramUpdate[]>('/api/green-api/updates', 'POST'),
  sendMessage: (chatId: string | number, text: string) => request<TelegramMessage>('/api/green-api/send', 'POST', { chatId, text }),
  disconnect: () => request<null>('/api/green-api/disconnect', 'POST')
};
