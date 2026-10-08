export type TelegramChatId = string | number;

export type GreenApiCredentials = {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
};

export type GreenApiInstance = {
  idInstance: string;
  stateInstance: string;
  wid?: string;
  typeInstance?: string;
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
  message_id: string;
  date: number;
  chat: TelegramChat;
  text?: string;
};

export type TelegramUpdate = {
  update_id: string;
  message?: TelegramMessage;
};

export type SendTextMessageCommand = {
  chatId: TelegramChatId;
  text: string;
};

export interface TelegramGateway {
  getProfile(credentials: GreenApiCredentials): Promise<GreenApiInstance>;
  getChats(credentials: GreenApiCredentials): Promise<TelegramChat[]>;
  getUpdates(credentials: GreenApiCredentials): Promise<TelegramUpdate[]>;
  sendTextMessage(credentials: GreenApiCredentials, command: SendTextMessageCommand): Promise<TelegramMessage>;
}

export type TelegramSession = {
  id: string;
  credentials: GreenApiCredentials;
  profile: GreenApiInstance;
  expiresAt: number;
};

export interface TelegramSessionStore {
  create(credentials: GreenApiCredentials, profile: GreenApiInstance): Promise<TelegramSession>;
  find(sessionId: string): Promise<TelegramSession | null>;
  delete(sessionId: string): Promise<void>;
}
