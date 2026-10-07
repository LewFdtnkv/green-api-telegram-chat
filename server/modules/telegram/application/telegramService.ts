import { HttpError } from '../../../shared/errors/HttpError.js';
import type { SendTextMessageCommand, TelegramGateway, TelegramSession, TelegramSessionStore, TelegramToken } from '../domain/types.js';

const TOKEN_PATTERN = /^\d{6,}:[A-Za-z0-9_-]{20,}$/;
const MAX_MESSAGE_LENGTH = 4096;

export type TelegramService = ReturnType<typeof createTelegramService>;

export function createTelegramService(gateway: TelegramGateway, sessions: TelegramSessionStore) {
  function getValidToken(value: unknown): TelegramToken {
    if (typeof value !== 'string' || !TOKEN_PATTERN.test(value.trim())) {
      throw new HttpError(400, 'Введите корректный токен бота.');
    }
    return value.trim();
  }

  function getValidOffset(value: unknown): number | undefined {
    if (value === undefined || value === null) return undefined;
    if (!Number.isInteger(value) || (value as number) < 0) {
      throw new HttpError(400, 'Параметр offset должен быть неотрицательным целым числом.');
    }
    return value as number;
  }

  function getValidCommand(chatId: unknown, text: unknown): SendTextMessageCommand {
    if (typeof chatId !== 'string' && typeof chatId !== 'number') {
      throw new HttpError(400, 'Выберите чат или укажите Chat ID.');
    }
    if (typeof text !== 'string' || !text.trim()) {
      throw new HttpError(400, 'Сообщение не может быть пустым.');
    }
    if (text.trim().length > MAX_MESSAGE_LENGTH) {
      throw new HttpError(400, 'Текст не должен быть длиннее 4096 символов.');
    }
    return { chatId, text: text.trim() };
  }

  async function getSession(sessionId: unknown): Promise<TelegramSession> {
    if (typeof sessionId !== 'string') throw new HttpError(401, 'Сессия Telegram не найдена. Подключите бота заново.');
    const session = await sessions.find(sessionId);
    if (!session) throw new HttpError(401, 'Сессия Telegram истекла. Подключите бота заново.');
    return session;
  }

  return {
    connect: async (token: unknown) => {
      const validToken = getValidToken(token);
      const profile = await gateway.getProfile(validToken);
      return sessions.create(validToken, profile);
    },
    getProfile: async (sessionId: unknown) => (await getSession(sessionId)).profile,
    getUpdates: async (sessionId: unknown, offset: unknown) => {
      const session = await getSession(sessionId);
      return gateway.getUpdates(session.token, getValidOffset(offset));
    },
    sendTextMessage: async (sessionId: unknown, chatId: unknown, text: unknown) => {
      const session = await getSession(sessionId);
      return gateway.sendTextMessage(session.token, getValidCommand(chatId, text));
    },
    disconnect: async (sessionId: unknown) => {
      if (typeof sessionId === 'string') await sessions.delete(sessionId);
    }
  };
}
