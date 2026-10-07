import type { ChatId, ChatSummary, MessageDirection, TelegramMessage } from '../../telegram/model/types';

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
  const nextChat: ChatSummary = { ...message.chat, lastMessage: message, lastDirection: direction };
  return [nextChat, ...chats.filter((chat) => String(chat.id) !== String(message.chat.id))];
}
