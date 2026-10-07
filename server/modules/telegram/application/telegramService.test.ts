import assert from 'node:assert/strict';
import test from 'node:test';
import { createTelegramService } from './telegramService.js';
import { HttpError } from '../../../shared/errors/HttpError.js';
import type { TelegramGateway } from '../domain/types.js';
import { createInMemoryTelegramSessionStore } from '../infrastructure/inMemoryTelegramSessionStore.js';

function createGateway(): TelegramGateway {
  return {
    getProfile: async () => ({ id: 1, first_name: 'Test bot', username: 'test_bot' }),
    getUpdates: async () => [],
    sendTextMessage: async (_token, command) => ({ message_id: 1, date: 0, chat: { id: command.chatId }, text: command.text })
  };
}

test('rejects malformed bot token before invoking the gateway', () => {
  const service = createTelegramService(createGateway(), createInMemoryTelegramSessionStore());
  return assert.rejects(() => service.connect('invalid'), (error: unknown) => error instanceof HttpError && error.statusCode === 400);
});

test('trims text before sending it through the gateway', async () => {
  const service = createTelegramService(createGateway(), createInMemoryTelegramSessionStore());
  const session = await service.connect('123456:ABCDEFGHIJKLMNOPQRST');
  const result = await service.sendTextMessage(session.id, 42, '  Привет  ');
  assert.equal(result.text, 'Привет');
  assert.equal(result.chat.id, 42);
});

test('rejects blank message text', async () => {
  const service = createTelegramService(createGateway(), createInMemoryTelegramSessionStore());
  const session = await service.connect('123456:ABCDEFGHIJKLMNOPQRST');
  await assert.rejects(() => service.sendTextMessage(session.id, 42, '   '), (error: unknown) => error instanceof HttpError && error.statusCode === 400);
});

test('rejects requests without a Telegram session', async () => {
  const service = createTelegramService(createGateway(), createInMemoryTelegramSessionStore());
  await assert.rejects(() => service.getUpdates('missing-session', null), (error: unknown) => error instanceof HttpError && error.statusCode === 401);
});
