import { HttpError } from '../../../shared/errors/HttpError.js';
import type { GreenApiCredentials, SendTextMessageCommand, TelegramGateway, TelegramSession, TelegramSessionStore } from '../domain/types.js';

const INSTANCE_ID_PATTERN = /^\d{1,20}$/;
const INSTANCE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,}$/;
const MAX_MESSAGE_LENGTH = 4096;

export type TelegramService = ReturnType<typeof createTelegramService>;

export function createTelegramService(gateway: TelegramGateway, sessions: TelegramSessionStore) {
  function getCredentials(idInstance: unknown, apiTokenInstance: unknown): GreenApiCredentials {
    if (typeof idInstance !== 'string' || !INSTANCE_ID_PATTERN.test(idInstance.trim())) {
      throw new HttpError(400, 'Введите корректный idInstance.');
    }
    if (typeof apiTokenInstance !== 'string' || !INSTANCE_TOKEN_PATTERN.test(apiTokenInstance.trim())) {
      throw new HttpError(400, 'Введите корректный apiTokenInstance.');
    }
    return { idInstance: idInstance.trim(), apiTokenInstance: apiTokenInstance.trim() };
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
    if (typeof sessionId !== 'string') throw new HttpError(401, 'Сессия GREEN-API не найдена. Подключите инстанс заново.');
    const session = await sessions.find(sessionId);
    if (!session) throw new HttpError(401, 'Сессия GREEN-API истекла. Подключите инстанс заново.');
    return session;
  }

  return {
    connect: async (idInstance: unknown, apiTokenInstance: unknown) => {
      const credentials = getCredentials(idInstance, apiTokenInstance);
      const profile = await gateway.getProfile(credentials);
      if (profile.stateInstance !== 'authorized') {
        throw new HttpError(400, `Инстанс не авторизован: ${profile.stateInstance}. Авторизуйте Telegram-инстанс в личном кабинете GREEN-API.`);
      }
      return sessions.create(credentials, profile);
    },
    getProfile: async (sessionId: unknown) => (await getSession(sessionId)).profile,
    getUpdates: async (sessionId: unknown) => {
      const session = await getSession(sessionId);
      return gateway.getUpdates(session.credentials);
    },
    sendTextMessage: async (sessionId: unknown, chatId: unknown, text: unknown) => {
      const session = await getSession(sessionId);
      return gateway.sendTextMessage(session.credentials, getValidCommand(chatId, text));
    },
    disconnect: async (sessionId: unknown) => {
      if (typeof sessionId === 'string') await sessions.delete(sessionId);
    }
  };
}
