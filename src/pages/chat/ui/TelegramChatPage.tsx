import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { telegramApi } from '../../../shared/api/telegram';
import { tokenSession } from '../../../shared/lib/session';
import type { ChatId, ChatSummary, MessagesByChat, TelegramBot, TelegramMessage } from '../../../entities/telegram/model/types';
import { createManualChat, upsertChat } from '../../../entities/chat/lib/chat';
import { appendMessage } from '../../../entities/message/lib/message';
import { BotConnectDialog } from '../../../features/connect-bot/ui/BotConnectDialog';
import { AddChatDialog } from '../../../features/add-chat/ui/AddChatDialog';
import { ChatSidebar } from '../../../widgets/chat-sidebar/ui/ChatSidebar';
import { ChatWindow } from '../../../widgets/chat-window/ui/ChatWindow';

export function TelegramChatPage() {
  const [token, setToken] = useState<string>(tokenSession.get);
  const [profile, setProfile] = useState<TelegramBot | null>(null);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [messages, setMessages] = useState<MessagesByChat>({});
  const [selectedChatId, setSelectedChatId] = useState<ChatId | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [showSettings, setShowSettings] = useState(() => !tokenSession.get());
  const [showNewChat, setShowNewChat] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const offsetRef = useRef<number | null>(null);
  const pollingRef = useRef(false);

  const selectedChat = chats.find((chat) => String(chat.id) === String(selectedChatId)) || null;
  const activeMessages = useMemo(() => messages[String(selectedChatId)] || [], [messages, selectedChatId]);

  const mergeMessage = useCallback((message: TelegramMessage, direction: 'incoming' | 'outgoing') => {
    setChats((current) => upsertChat(current, message, direction));
    setMessages((current) => appendMessage(current, message, direction));
  }, []);

  const readUpdates = useCallback(async () => {
    if (!token || pollingRef.current) return;
    pollingRef.current = true;
    setIsPolling(true);
    try {
      const updates = await telegramApi.getUpdates(token, offsetRef.current);
      updates.forEach((update) => {
        offsetRef.current = Math.max(offsetRef.current || 0, update.update_id + 1);
        if (update.message?.text) mergeMessage(update.message, 'incoming');
      });
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось получить сообщения.');
    } finally {
      pollingRef.current = false;
      setIsPolling(false);
    }
  }, [mergeMessage, token]);

  useEffect(() => {
    if (!token) return undefined;
    readUpdates();
    const timer = window.setInterval(readUpdates, 5000);
    return () => window.clearInterval(timer);
  }, [readUpdates, token]);

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const tokenValue = new FormData(event.currentTarget).get('token');
    const nextToken = typeof tokenValue === 'string' ? tokenValue.trim() : '';
    if (!nextToken) return;
    setError('');
    setIsConnecting(true);
    try {
      const bot = await telegramApi.getProfile(nextToken);
      tokenSession.set(nextToken);
      setToken(nextToken);
      setProfile(bot);
      setShowSettings(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось подключить бота.');
    } finally {
      setIsConnecting(false);
    }
  }

  function addChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const chatId = new FormData(event.currentTarget).get('chatId');
    const id = typeof chatId === 'string' ? chatId.trim() : '';
    if (!id) return;
    setChats((current) => current.some((chat) => String(chat.id) === id) ? current : [createManualChat(id), ...current]);
    setSelectedChatId(id);
    setShowNewChat(false);
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedChat || !messageDraft.trim() || isSending) return;
    setError('');
    setIsSending(true);
    try {
      const message = await telegramApi.sendMessage(token, selectedChat.id, messageDraft);
      mergeMessage(message, 'outgoing');
      setMessageDraft('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось отправить сообщение.');
    } finally {
      setIsSending(false);
    }
  }

  function disconnect() {
    tokenSession.clear();
    offsetRef.current = null;
    setToken('');
    setProfile(null);
    setChats([]);
    setMessages({});
    setSelectedChatId(null);
    setShowSettings(true);
    setError('');
  }

  return (
    <main className="app-shell">
      <ChatSidebar profile={profile} chats={chats} selectedChatId={selectedChatId} isConnected={Boolean(token)} isPolling={isPolling} onSelect={setSelectedChatId} onOpenSettings={() => setShowSettings(true)} onOpenNewChat={() => setShowNewChat(true)} onRefresh={readUpdates} />
      <section className={`chat-panel ${selectedChat ? 'open' : ''}`}>
        <ChatWindow chat={selectedChat} messages={activeMessages} draft={messageDraft} isSending={isSending} isConnected={Boolean(token)} onDraftChange={setMessageDraft} onSend={sendMessage} onBack={() => setSelectedChatId(null)} onOpenNewChat={() => setShowNewChat(true)} onOpenSettings={() => setShowSettings(true)} />
      </section>
      {error && <div className="toast" role="alert"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Закрыть">×</button></div>}
      {showSettings && <BotConnectDialog profile={profile} token={token} onConnect={connect} onClose={() => setShowSettings(false)} onDisconnect={disconnect} isConnecting={isConnecting} />}
      {showNewChat && <AddChatDialog onSubmit={addChat} onClose={() => setShowNewChat(false)} />}
    </main>
  );
}
