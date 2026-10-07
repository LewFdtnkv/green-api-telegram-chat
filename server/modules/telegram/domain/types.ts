export type TelegramToken = string;
export type TelegramChatId = string | number;

export type TelegramBot = {
  id: number;
  first_name: string;
  username: string;
};

export type TelegramChat = {
  id: TelegramChatId;
  type?: string;
  title?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export type TelegramMessage = {
  message_id: number;
  date: number;
  chat: TelegramChat;
  text?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

export type SendTextMessageCommand = {
  chatId: TelegramChatId;
  text: string;
};

export interface TelegramGateway {
  getProfile(token: TelegramToken): Promise<TelegramBot>;
  getUpdates(token: TelegramToken, offset?: number): Promise<TelegramUpdate[]>;
  sendTextMessage(token: TelegramToken, command: SendTextMessageCommand): Promise<TelegramMessage>;
}

export type TelegramSession = {
  id: string;
  token: TelegramToken;
  profile: TelegramBot;
  expiresAt: number;
};

export interface TelegramSessionStore {
  create(token: TelegramToken, profile: TelegramBot): Promise<TelegramSession>;
  find(sessionId: string): Promise<TelegramSession | null>;
  delete(sessionId: string): Promise<void>;
}
