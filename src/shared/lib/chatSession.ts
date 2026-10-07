import type { ChatId, ChatSummary, MessagesByChat } from '../../entities/telegram/model/types';

const CHAT_SESSION_KEY = 'telegram-inbox-chat-session';

export type ChatSessionSnapshot = {
  chats: ChatSummary[];
  messages: MessagesByChat;
  selectedChatId: ChatId | null;
  offset: number | null;
};

const emptySnapshot: ChatSessionSnapshot = {
  chats: [],
  messages: {},
  selectedChatId: null,
  offset: null
};

export const chatSession = {
  get: (): ChatSessionSnapshot => {
    try {
      const rawValue = sessionStorage.getItem(CHAT_SESSION_KEY);
      if (!rawValue) return emptySnapshot;
      const value = JSON.parse(rawValue) as Partial<ChatSessionSnapshot>;
      if (!Array.isArray(value.chats) || typeof value.messages !== 'object' || value.messages === null) return emptySnapshot;
      return {
        chats: value.chats,
        messages: value.messages,
        selectedChatId: typeof value.selectedChatId === 'string' || typeof value.selectedChatId === 'number' ? value.selectedChatId : null,
        offset: typeof value.offset === 'number' && Number.isInteger(value.offset) ? value.offset : null
      };
    } catch {
      return emptySnapshot;
    }
  },
  set: (snapshot: ChatSessionSnapshot): void => sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(snapshot)),
  clear: (): void => sessionStorage.removeItem(CHAT_SESSION_KEY)
};
