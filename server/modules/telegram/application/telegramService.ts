import { HttpError } from '../../../shared/errors/HttpError.js';
import type { SendTextMessageCommand, TelegramGateway, TelegramToken } from '../domain/types.js';

const TOKEN_PATTERN = /^\d{6,}:[A-Za-z0-9_-]{20,}$/;
const MAX_MESSAGE_LENGTH = 4096;

export type TelegramService = ReturnType<typeof createTelegramService>;

export function createTelegramService(gateway: TelegramGateway) {
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

  return {
    getProfile: (token: unknown) => gateway.getProfile(getValidToken(token)),
    getUpdates: (token: unknown, offset: unknown) => gateway.getUpdates(getValidToken(token), getValidOffset(offset)),
    sendTextMessage: (token: unknown, chatId: unknown, text: unknown) => gateway.sendTextMessage(getValidToken(token), getValidCommand(chatId, text))
  };
}
