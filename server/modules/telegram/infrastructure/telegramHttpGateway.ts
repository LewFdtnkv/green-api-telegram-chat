import { HttpError } from '../../../shared/errors/HttpError.js';
import type { GreenApiCredentials, GreenApiInstance, SendTextMessageCommand, TelegramGateway, TelegramMessage, TelegramUpdate } from '../domain/types.js';

type GreenApiError = {
  message?: string;
  description?: string;
};

type GreenApiSettings = {
  wid?: string;
  typeInstance?: string;
};

type GreenApiState = {
  stateInstance?: string;
};

type GreenApiNotification = {
  receiptId?: number | string;
  body?: {
    typeWebhook?: string;
    timestamp?: number;
    idMessage?: string;
    senderData?: {
      chatId?: string;
      chatName?: string;
      senderName?: string;
      senderContactName?: string;
    };
    messageData?: {
      typeMessage?: string;
      textMessageData?: {
        textMessage?: string;
      };
    };
  };
};

type GreenApiSendResult = {
  idMessage?: string;
};

type FetchClient = typeof fetch;

export function createTelegramHttpGateway(fetchClient: FetchClient = fetch): TelegramGateway {
  async function request<T>(credentials: GreenApiCredentials, method: string, init: RequestInit = {}): Promise<T> {
    let response: Response;
    try {
      response = await fetchClient(createUrl(credentials, method), init);
    } catch {
      throw new HttpError(502, 'Не удалось связаться с GREEN-API.');
    }

    const data = await response.json().catch(() => null) as (T & GreenApiError) | null;
    if (!response.ok) {
      const message = data?.message || data?.description || 'GREEN-API вернул ошибку.';
      throw new HttpError(response.status >= 400 && response.status < 500 ? 400 : 502, message);
    }
    if (data === null) {
      throw new HttpError(502, 'GREEN-API вернул пустой ответ.');
    }
    return data;
  }

  async function receiveNotification(credentials: GreenApiCredentials): Promise<GreenApiNotification | null> {
    let response: Response;
    try {
      response = await fetchClient(`${createUrl(credentials, 'receiveNotification')}?receiveTimeout=5`);
    } catch {
      throw new HttpError(502, 'Не удалось получить уведомления GREEN-API.');
    }
    if (response.status === 204) return null;

    const data = await response.json().catch(() => null) as (GreenApiNotification & GreenApiError) | null;
    if (!response.ok) {
      throw new HttpError(response.status >= 400 && response.status < 500 ? 400 : 502, data?.message || data?.description || 'GREEN-API вернул ошибку.');
    }
    return data?.receiptId === undefined ? null : data;
  }

  async function deleteNotification(credentials: GreenApiCredentials, receiptId: number | string): Promise<void> {
    await request(credentials, `deleteNotification/${encodeURIComponent(String(receiptId))}`, { method: 'DELETE' });
  }

  return {
    async getProfile(credentials) {
      const [state, settings] = await Promise.all([
        request<GreenApiState>(credentials, 'getStateInstance'),
        request<GreenApiSettings>(credentials, 'getSettings')
      ]);
      return {
        idInstance: credentials.idInstance,
        stateInstance: state.stateInstance || 'unknown',
        wid: settings.wid,
        typeInstance: settings.typeInstance
      } satisfies GreenApiInstance;
    },
    async getUpdates(credentials) {
      const notification = await receiveNotification(credentials);
      if (!notification || notification.receiptId === undefined) return [];

      try {
        const body = notification.body;
        const text = body?.messageData?.textMessageData?.textMessage;
        const chatId = body?.senderData?.chatId;
        if (body?.typeWebhook !== 'incomingMessageReceived' || body.messageData?.typeMessage !== 'textMessage' || !text || !chatId) {
          return [];
        }

        const message: TelegramMessage = {
          message_id: body.idMessage || String(notification.receiptId),
          date: body.timestamp || Math.floor(Date.now() / 1000),
          chat: {
            id: chatId,
            title: body.senderData?.senderContactName || body.senderData?.senderName || body.senderData?.chatName
          },
          text
        };
        return [{ update_id: String(notification.receiptId), message }] satisfies TelegramUpdate[];
      } finally {
        await deleteNotification(credentials, notification.receiptId);
      }
    },
    async sendTextMessage(credentials, command: SendTextMessageCommand) {
      const result = await request<GreenApiSendResult>(credentials, 'sendMessage', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chatId: command.chatId, message: command.text })
      });
      return {
        message_id: result.idMessage || `local-${Date.now()}`,
        date: Math.floor(Date.now() / 1000),
        chat: { id: command.chatId },
        text: command.text
      };
    }
  };
}

function createUrl(credentials: GreenApiCredentials, method: string): string {
  return `${credentials.apiUrl}/waInstance${encodeURIComponent(credentials.idInstance)}/${method}/${encodeURIComponent(credentials.apiTokenInstance)}`;
}
