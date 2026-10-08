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
  message_id: string;
  date: number;
  chat: TelegramChat;
  text?: string;
  direction?: MessageDirection;
}

export interface TelegramUpdate {
  update_id: string;
  message?: TelegramMessage;
}

export interface GreenApiInstance {
  idInstance: string;
  stateInstance: string;
  wid?: string;
  typeInstance?: string;
}

export type MessageDirection = 'incoming' | 'outgoing';

export type ChatSummary = TelegramChat & {
  lastMessage?: TelegramMessage;
  lastDirection?: MessageDirection;
};

export type MessagesByChat = Record<string, TelegramMessage[]>;
