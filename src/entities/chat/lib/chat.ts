import type { ChatId, ChatSummary, MessageDirection, TelegramChat, TelegramMessage } from '../../telegram/model/types';

export function getChatTitle(chat: ChatSummary): string {
  return chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.username || `Чат ${chat.id}`;
}

export function getChatInitials(chat: ChatSummary): string {
  return getChatTitle(chat).slice(0, 2).toUpperCase();
}

export function createManualChat(id: ChatId): ChatSummary {
  return { id, title: `Чат ${id}` };
}

export function upsertChat(chats: ChatSummary[], message: TelegramMessage, direction: MessageDirection): ChatSummary[] {
  const previousChat = chats.find((chat) => String(chat.id) === String(message.chat.id));
  const nextChat: ChatSummary = { ...previousChat, ...message.chat, lastMessage: message, lastDirection: direction };
  return [nextChat, ...chats.filter((chat) => String(chat.id) !== String(message.chat.id))];
}

export function mergeChatList(chats: ChatSummary[], remoteChats: TelegramChat[]): ChatSummary[] {
  const currentById = new Map(chats.map((chat) => [String(chat.id), chat]));
  const remoteIds = new Set(remoteChats.map((chat) => String(chat.id)));
  const synchronized = remoteChats.map((chat) => {
    const current = currentById.get(String(chat.id));
    return { ...current, ...chat } satisfies ChatSummary;
  });
  return [...synchronized, ...chats.filter((chat) => !remoteIds.has(String(chat.id)))];
}
