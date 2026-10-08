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
  const gateway = createTelegramHttpGateway(async (input, init) => {
    const url = String(input);
    const method = init?.method || 'GET';
    requests.push({ url, method });

    if (url.includes('receiveNotification')) {
      return Response.json({
        receiptId: 25,
        body: {
          typeWebhook: 'incomingMessageReceived',
          timestamp: 1_700_000_000,
          idMessage: 'message-1',
          senderData: { chatId: '42', senderName: 'Тестовый пользователь' },
          messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет' } }
        }
      });
    }
    if (url.includes('deleteNotification/25')) return Response.json({ result: true });
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
  assert.equal(requests.length, 2);
  assert.equal(requests[0]?.method, 'GET');
  assert.equal(requests[1]?.method, 'DELETE');
});

test('treats an empty GREEN-API queue response as no updates', async () => {
  const gateway = createTelegramHttpGateway(async () => Response.json(null));

  const updates = await gateway.getUpdates(credentials);

  assert.deepEqual(updates, []);
});
