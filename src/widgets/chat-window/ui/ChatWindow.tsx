import type { ChangeEventHandler, FormEventHandler } from 'react';
import { ArrowLeft, Bot, Check, LoaderCircle, MessageCircleMore, PencilLine, Plus, SendHorizonal } from 'lucide-react';
import type { ChatSummary, TelegramMessage } from '../../../entities/telegram/model/types';
import { getChatInitials, getChatTitle } from '../../../entities/chat/lib/chat';
import { formatMessageTime } from '../../../entities/message/lib/message';

type ChatWindowProps = {
  chat: ChatSummary | null;
  messages: TelegramMessage[];
  draft: string;
  isSending: boolean;
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  onDraftChange: (value: string) => void;
  onSend: FormEventHandler<HTMLFormElement>;
  onBack: () => void;
  onOpenNewChat: () => void;
  onOpenSettings: () => void;
};

export function ChatWindow({ chat, messages, draft, isSending, isConnected, connectionStatus, onDraftChange, onSend, onBack, onOpenNewChat, onOpenSettings }: ChatWindowProps) {
  if (!chat) return <Welcome isConnected={isConnected} onOpenNewChat={onOpenNewChat} onOpenSettings={onOpenSettings} />;
  const handleDraftChange: ChangeEventHandler<HTMLTextAreaElement> = (event) => onDraftChange(event.target.value);
  return (
    <>
      <header className="chat-header">
        <button className="icon-button quiet mobile-back" type="button" title="К списку чатов" onClick={onBack}><ArrowLeft size={19} /></button>
        <span className="avatar large">{getChatInitials(chat)}</span>
        <div><h1>{getChatTitle(chat)}</h1><p>{chat.username ? `@${chat.username}` : `Chat ID: ${chat.id}`}</p></div>
        <button className="icon-button quiet header-action" type="button" title="Изменить чат" onClick={onOpenNewChat}><PencilLine size={18} /></button>
      </header>
      <div className="message-area">
        <div className={`notice ${connectionStatus === 'error' ? 'notice-error' : ''}`}><Check size={15} /> {connectionStatus === 'error' ? 'Проверьте подключение к Telegram' : 'Получаются только текстовые сообщения'}</div>
        {messages.map((message) => <article key={message.message_id} className={`message ${message.direction === 'outgoing' ? 'outgoing' : 'incoming'}`}><p>{message.text}</p><time>{formatMessageTime(message.date)}{message.direction === 'outgoing' && <Check size={14} />}</time></article>)}
        {messages.length === 0 && <div className="chat-empty"><MessageCircleMore size={34} /><p>Напишите первое сообщение</p></div>}
      </div>
      <form className="composer" onSubmit={onSend}>
        <textarea value={draft} onChange={handleDraftChange} placeholder="Сообщение" rows={1} maxLength={4096} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
        <button className="send-button" type="submit" title="Отправить" disabled={!draft.trim() || isSending}>{isSending ? <LoaderCircle className="spin" size={20} /> : <SendHorizonal size={20} />}</button>
      </form>
    </>
  );
}

type WelcomeProps = Pick<ChatWindowProps, 'isConnected' | 'onOpenNewChat' | 'onOpenSettings'>;

function Welcome({ isConnected, onOpenNewChat, onOpenSettings }: WelcomeProps) {
  return <div className="welcome-screen"><div className="welcome-icon"><Bot size={36} /></div><h1>{isConnected ? 'Выберите чат' : 'Подключите Telegram-бота'}</h1><p>{isConnected ? 'Выберите чат слева или добавьте его по Chat ID.' : 'Введите токен бота, чтобы отправлять и получать текстовые сообщения.'}</p><button className="primary-button" type="button" onClick={isConnected ? onOpenNewChat : onOpenSettings}>{isConnected ? <><Plus size={18} /> Добавить чат</> : <><MessageCircleMore size={18} /> Подключить бота</>}</button></div>;
}
