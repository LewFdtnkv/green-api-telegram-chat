import assert from 'node:assert/strict';
import test from 'node:test';
import { createTelegramService } from './telegramService.js';
import { HttpError } from '../../../shared/errors/HttpError.js';
import type { TelegramGateway } from '../domain/types.js';
import { createInMemoryTelegramSessionStore } from '../infrastructure/inMemoryTelegramSessionStore.js';

function createGateway(): TelegramGateway {
  return {
    getProfile: async (credentials) => ({ idInstance: credentials.idInstance, stateInstance: 'authorized', typeInstance: 'telegram' }),
    getUpdates: async () => [],
    sendTextMessage: async (_credentials, command) => ({ message_id: '1', date: 0, chat: { id: command.chatId }, text: command.text })
  };
}

test('rejects malformed GREEN-API credentials before invoking the gateway', () => {
  const service = createTelegramService(createGateway(), createInMemoryTelegramSessionStore());
  return assert.rejects(() => service.connect('not-an-id', 'short'), (error: unknown) => error instanceof HttpError && error.statusCode === 400);
});

test('trims text before sending it through the gateway', async () => {
  const service = createTelegramService(createGateway(), createInMemoryTelegramSessionStore());
  const session = await service.connect('1100000000', 'ABCDEFGHIJKLMNOPQRSTUVWX');
  const result = await service.sendTextMessage(session.id, 42, '  Привет  ');
  assert.equal(result.text, 'Привет');
  assert.equal(result.chat.id, 42);
});

test('rejects blank message text', async () => {
  const service = createTelegramService(createGateway(), createInMemoryTelegramSessionStore());
  const session = await service.connect('1100000000', 'ABCDEFGHIJKLMNOPQRSTUVWX');
  await assert.rejects(() => service.sendTextMessage(session.id, 42, '   '), (error: unknown) => error instanceof HttpError && error.statusCode === 400);
});

test('rejects requests without a GREEN-API session', async () => {
  const service = createTelegramService(createGateway(), createInMemoryTelegramSessionStore());
  await assert.rejects(() => service.getUpdates('missing-session'), (error: unknown) => error instanceof HttpError && error.statusCode === 401);
});

test('rejects an instance that is not authorized', async () => {
  const gateway: TelegramGateway = { ...createGateway(), getProfile: async (credentials) => ({ idInstance: credentials.idInstance, stateInstance: 'notAuthorized' }) };
  const service = createTelegramService(gateway, createInMemoryTelegramSessionStore());
  await assert.rejects(() => service.connect('1100000000', 'ABCDEFGHIJKLMNOPQRSTUVWX'), (error: unknown) => error instanceof HttpError && error.statusCode === 400);
});
