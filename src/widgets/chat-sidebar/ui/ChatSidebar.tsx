import { Bot, CircleHelp, LoaderCircle, MessageCircleMore, Plus, Settings2 } from 'lucide-react';
import type { ChatId, ChatSummary, TelegramBot } from '../../../entities/telegram/model/types';
import { getChatInitials, getChatTitle } from '../../../entities/chat/lib/chat';
import { formatMessageTime, getMessagePreview } from '../../../entities/message/lib/message';

type ChatSidebarProps = {
  profile: TelegramBot | null;
  chats: ChatSummary[];
  selectedChatId: ChatId | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  isPolling: boolean;
  onSelect: (chatId: ChatId) => void;
  onOpenSettings: () => void;
  onOpenNewChat: () => void;
  onRefresh: () => void;
};

export function ChatSidebar({ profile, chats, selectedChatId, connectionStatus, isPolling, onSelect, onOpenSettings, onOpenNewChat, onRefresh }: ChatSidebarProps) {
  const isConnected = connectionStatus === 'connected';
  return (
    <aside className="sidebar">
      <div className="brand-row">
        <div className="brand-mark"><MessageCircleMore size={22} /></div>
        <div><strong>Telegram Inbox</strong><span>{profile ? `@${profile.username}` : 'Bot API'}</span></div>
        <button className="icon-button quiet" type="button" title="Настройки бота" onClick={onOpenSettings}><Settings2 size={19} /></button>
      </div>
      <div className="sidebar-actions">
        <button className="new-chat-button" type="button" onClick={onOpenNewChat} disabled={!isConnected}><Plus size={18} /> Новый чат</button>
        <button className="icon-button outlined" type="button" title="Обновить сообщения" onClick={onRefresh} disabled={!isConnected || isPolling}><LoaderCircle className={isPolling ? 'spin' : ''} size={18} /></button>
      </div>
      <div className="chat-list" aria-label="Список чатов">
        {chats.length === 0 ? <EmptyList connectionStatus={connectionStatus} /> : chats.map((chat) => (
          <button key={chat.id} type="button" className={`chat-item ${String(chat.id) === String(selectedChatId) ? 'selected' : ''}`} onClick={() => onSelect(chat.id)}>
            <span className="avatar">{getChatInitials(chat)}</span>
            <span className="chat-copy"><strong>{getChatTitle(chat)}</strong><span>{getMessagePreview(chat.lastMessage)}</span></span>
            <time>{formatMessageTime(chat.lastMessage?.date)}</time>
          </button>
        ))}
      </div>
      <div className="sidebar-footer"><div className="connection-state"><span className={`status-dot ${connectionStatus}`} />{getStatusLabel(connectionStatus, isPolling)}</div><button className="icon-button quiet" type="button" title="Открыть подсказку" onClick={onOpenSettings}><CircleHelp size={18} /></button></div>
    </aside>
  );
}

function EmptyList({ connectionStatus }: Pick<ChatSidebarProps, 'connectionStatus'>) {
  const isConnected = connectionStatus === 'connected';
  const hasConnectionError = connectionStatus === 'error';
  return <div className="empty-list"><Bot size={28} /><p>{hasConnectionError ? 'Не удалось связаться с Telegram' : isConnected ? 'Пока нет чатов' : 'Подключите бота'}</p><span>{hasConnectionError ? 'Проверьте токен или подключение к сети.' : isConnected ? 'Попросите пользователя написать боту или добавьте Chat ID.' : 'Введите токен, полученный в BotFather.'}</span></div>;
}

function getStatusLabel(status: ChatSidebarProps['connectionStatus'], isPolling: boolean) {
  if (isPolling) return 'Обновляем сообщения';
  if (status === 'connecting') return 'Проверяем бота';
  if (status === 'connected') return 'Подключено';
  if (status === 'error') return 'Ошибка соединения';
  return 'Не подключено';
}
