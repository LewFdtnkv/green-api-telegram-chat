import { HttpError } from '../../../shared/errors/HttpError.js';
import type { SendTextMessageCommand, TelegramBot, TelegramGateway, TelegramMessage, TelegramToken, TelegramUpdate } from '../domain/types.js';

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

type FetchClient = typeof fetch;

export function createTelegramHttpGateway(fetchClient: FetchClient = fetch): TelegramGateway {
  async function request<T>(token: TelegramToken, method: string, payload: Record<string, unknown>): Promise<T> {
    let response: Response;
    try {
      response = await fetchClient(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch {
      throw new HttpError(502, 'Не удалось связаться с Telegram API.');
    }

    const data = await response.json().catch(() => ({})) as TelegramApiResponse<T>;
    if (!response.ok || !data.ok || data.result === undefined) {
      throw new HttpError(response.status || 502, data.description || 'Telegram API вернул ошибку.');
    }
    return data.result;
  }

  return {
    getProfile: (token) => request<TelegramBot>(token, 'getMe', {}),
    getUpdates: (token, offset) => request<TelegramUpdate[]>(token, 'getUpdates', {
      offset,
      // The browser owns the short polling cadence, so a manual refresh returns immediately.
      timeout: 0,
      allowed_updates: ['message']
    }),
    sendTextMessage: (token, command: SendTextMessageCommand) => request<TelegramMessage>(token, 'sendMessage', {
      chat_id: command.chatId,
      text: command.text
    })
  };
}
