import type { MessageDirection, MessagesByChat, TelegramMessage } from '../../telegram/model/types';

export function formatMessageTime(unixTime?: number): string {
  if (!unixTime) return '';
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(unixTime * 1000);
}

export function getMessagePreview(message?: TelegramMessage): string {
  if (!message) return 'Нет сообщений';
  return message.text || 'Неподдерживаемое сообщение';
}

export function appendMessage(messagesByChat: MessagesByChat, message: TelegramMessage, direction: MessageDirection): MessagesByChat {
  const key = String(message.chat.id);
  const current = messagesByChat[key] || [];
  if (current.some((item) => item.message_id === message.message_id)) return messagesByChat;
  const next = [...current, { ...message, direction }].sort((left, right) => left.date - right.date);
  return { ...messagesByChat, [key]: next };
}
