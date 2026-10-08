import assert from 'node:assert/strict';
import test from 'node:test';
import { createTelegramHttpGateway } from './telegramHttpGateway.js';

const credentials = {
  apiUrl: 'https://4100.api.green-api.com',
  idInstance: '1100000000',
  apiTokenInstance: 'ABCDEFGHIJKLMNOPQRSTUVWX'
};

test('turns an incoming GREEN-API notification into a chat message and acknowledges it', async () => {
  const requests: Array<{ url: string; method: string }> = [];
  const notifications = [{
    receiptId: 25,
    body: {
      typeWebhook: 'incomingMessageReceived',
      timestamp: 1_700_000_000,
      idMessage: 'message-1',
      senderData: { chatId: '42', senderName: 'Тестовый пользователь' },
      messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет' } }
    }
  }, null];
  const gateway = createTelegramHttpGateway(async (input, init) => {
    const url = String(input);
    const method = init?.method || 'GET';
    requests.push({ url, method });

    if (url.includes('receiveNotification')) {
      return Response.json(notifications.shift());
    }
    if (url.includes(`deleteNotification/${credentials.apiTokenInstance}/25`)) return Response.json({ result: true });
    throw new Error(`Unexpected request: ${url}`);
  });

  const updates = await gateway.getUpdates(credentials);

  assert.deepEqual(updates, [{
    update_id: '25',
    message: {
      message_id: 'message-1',
      date: 1_700_000_000,
      chat: { id: '42', title: 'Тестовый пользователь' },
      text: 'Привет'
    }
  }]);
  assert.equal(requests.length, 3);
  assert.equal(requests[0]?.method, 'GET');
  assert.equal(requests[1]?.method, 'DELETE');
  assert.match(requests[1]?.url || '', new RegExp(`deleteNotification/${credentials.apiTokenInstance}/25$`));
});

test('treats an empty GREEN-API queue response as no updates', async () => {
  const gateway = createTelegramHttpGateway(async () => Response.json(null));

  const updates = await gateway.getUpdates(credentials);

  assert.deepEqual(updates, []);
});

test('maps the full GREEN-API chat list', async () => {
  const gateway = createTelegramHttpGateway(async (input) => {
    const url = String(input);
    if (url.includes('getChats')) {
      return Response.json([
        { chatId: '-1001', name: 'Рабочая группа', type: 'supergroup', username: '@work' },
        { chatId: '42', name: 'Тестовый пользователь', type: 'user' }
      ]);
    }
    throw new Error(`Unexpected request: ${url}`);
  });

  const chats = await gateway.getChats(credentials);

  assert.deepEqual(chats, [
    { id: '-1001', title: 'Рабочая группа', type: 'supergroup', username: '@work' },
    { id: '42', title: 'Тестовый пользователь', type: 'user', username: undefined }
  ]);
});
