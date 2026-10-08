import { Bot, CircleHelp, LoaderCircle, MessageCircleMore, PanelLeftClose, PanelLeftOpen, Plus, Settings2 } from 'lucide-react';
import type { ChatId, ChatSummary, GreenApiInstance } from '../../../entities/telegram/model/types';
import { getChatInitials, getChatTitle } from '../../../entities/chat/lib/chat';
import { formatMessageTime, getMessagePreview } from '../../../entities/message/lib/message';

type ChatSidebarProps = {
  profile: GreenApiInstance | null;
  chats: ChatSummary[];
  selectedChatId: ChatId | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  isRefreshing: boolean;
  isCollapsed: boolean;
  onSelect: (chatId: ChatId) => void;
  onToggleCollapse: () => void;
  onOpenSettings: () => void;
  onOpenNewChat: () => void;
  onRefresh: () => void;
};

export function ChatSidebar({ profile, chats, selectedChatId, connectionStatus, isRefreshing, isCollapsed, onSelect, onToggleCollapse, onOpenSettings, onOpenNewChat, onRefresh }: ChatSidebarProps) {
  const isConnected = connectionStatus === 'connected';
  return (
    <aside className={`sidebar ${isCollapsed ? 'is-collapsed' : ''}`}>
      <div className="brand-row">
        <div className="brand-mark"><MessageCircleMore size={22} /></div>
        <div className="brand-copy"><strong>Telegram Inbox</strong><span>{profile ? `GREEN-API: ${profile.idInstance}` : 'GREEN-API'}</span></div>
        <button className="icon-button quiet settings-button" type="button" title="Настройки GREEN-API" onClick={onOpenSettings}><Settings2 size={19} /></button>
        <button className="icon-button quiet collapse-button" type="button" title={isCollapsed ? 'Развернуть список чатов' : 'Свернуть список чатов'} aria-label={isCollapsed ? 'Развернуть список чатов' : 'Свернуть список чатов'} aria-pressed={isCollapsed} onClick={onToggleCollapse}>
          {isCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
        </button>
      </div>
      <div className="sidebar-actions">
        <button className="new-chat-button" type="button" title="Новый чат" onClick={onOpenNewChat} disabled={!isConnected}><Plus size={18} /><span>Новый чат</span></button>
        <button className="icon-button outlined" type="button" title="Обновить сообщения" onClick={onRefresh} disabled={!isConnected || isRefreshing}><LoaderCircle className={isRefreshing ? 'spin' : ''} size={18} /></button>
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
      <div className="sidebar-footer"><div className="connection-state"><span className={`status-dot ${connectionStatus}`} />{getStatusLabel(connectionStatus, isRefreshing)}</div><button className="icon-button quiet" type="button" title="Открыть подсказку" onClick={onOpenSettings}><CircleHelp size={18} /></button></div>
    </aside>
  );
}

function EmptyList({ connectionStatus }: Pick<ChatSidebarProps, 'connectionStatus'>) {
  const isConnected = connectionStatus === 'connected';
  const hasConnectionError = connectionStatus === 'error';
  return <div className="empty-list"><Bot size={28} /><p>{hasConnectionError ? 'Не удалось связаться с GREEN-API' : isConnected ? 'Пока нет чатов' : 'Подключите инстанс'}</p><span>{hasConnectionError ? 'Проверьте реквизиты инстанса и подключение к сети.' : isConnected ? 'Напишите в Telegram или добавьте Chat ID.' : 'Введите idInstance и apiTokenInstance.'}</span></div>;
}

function getStatusLabel(status: ChatSidebarProps['connectionStatus'], isRefreshing: boolean) {
  if (isRefreshing) return 'Обновляем сообщения';
  if (status === 'connecting') return 'Проверяем инстанс';
  if (status === 'connected') return 'Подключено';
  if (status === 'error') return 'Ошибка соединения';
  return 'Не подключено';
}
