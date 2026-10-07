export type ChatId = string | number;

export interface TelegramChat {
  id: ChatId;
  type?: string;
  title?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TelegramMessage {
  message_id: number;
  date: number;
  chat: TelegramChat;
  text?: string;
  direction?: MessageDirection;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface TelegramBot {
  id: number;
  first_name: string;
  username: string;
}

export type MessageDirection = 'incoming' | 'outgoing';

export type ChatSummary = TelegramChat & {
  lastMessage?: TelegramMessage;
  lastDirection?: MessageDirection;
};

export type MessagesByChat = Record<string, TelegramMessage[]>;
