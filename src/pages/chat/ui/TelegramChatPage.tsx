import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ApiError, telegramApi } from '../../../shared/api/telegram';
import { chatSession } from '../../../shared/lib/chatSession';
import type { ChatId, ChatSummary, MessagesByChat, TelegramBot, TelegramMessage } from '../../../entities/telegram/model/types';
import { createManualChat, upsertChat } from '../../../entities/chat/lib/chat';
import { appendMessage } from '../../../entities/message/lib/message';
import { BotConnectDialog } from '../../../features/connect-bot/ui/BotConnectDialog';
import { AddChatDialog } from '../../../features/add-chat/ui/AddChatDialog';
import { ChatSidebar } from '../../../widgets/chat-sidebar/ui/ChatSidebar';
import { ChatWindow } from '../../../widgets/chat-window/ui/ChatWindow';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export function TelegramChatPage() {
  const [initialChatSession] = useState(() => chatSession.get());
  const [profile, setProfile] = useState<TelegramBot | null>(null);
  const [chats, setChats] = useState<ChatSummary[]>(initialChatSession.chats);
  const [messages, setMessages] = useState<MessagesByChat>(initialChatSession.messages);
  const [selectedChatId, setSelectedChatId] = useState<ChatId | null>(initialChatSession.selectedChatId);
  const [offset, setOffset] = useState<number | null>(initialChatSession.offset);
  const [messageDraft, setMessageDraft] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const offsetRef = useRef<number | null>(initialChatSession.offset);
  const pollingRef = useRef(false);

  const selectedChat = chats.find((chat) => String(chat.id) === String(selectedChatId)) || null;
  const activeMessages = useMemo(() => messages[String(selectedChatId)] || [], [messages, selectedChatId]);

  const mergeMessage = useCallback((message: TelegramMessage, direction: 'incoming' | 'outgoing') => {
    setChats((current) => upsertChat(current, message, direction));
    setMessages((current) => appendMessage(current, message, direction));
  }, []);

  useEffect(() => {
    chatSession.set({ chats, messages, selectedChatId, offset });
  }, [chats, messages, offset, selectedChatId]);

  useEffect(() => {
    let isActive = true;

    telegramApi.getSession()
      .then((bot) => {
        if (!isActive) return;
        setProfile(bot);
        setConnectionStatus('connected');
      })
      .catch((requestError) => {
        if (!isActive) return;
        if (requestError instanceof ApiError && requestError.status === 401) {
          setConnectionStatus('disconnected');
          return;
        }
        setConnectionStatus('error');
        setError(requestError instanceof Error ? requestError.message : 'Не удалось восстановить подключение бота.');
      });

    return () => { isActive = false; };
  }, []);

  const readUpdates = useCallback(async (isManualRefresh = false) => {
    if (!profile || pollingRef.current) return;
    pollingRef.current = true;
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const updates = await telegramApi.getUpdates(offsetRef.current);
      let nextOffset = offsetRef.current;
      updates.forEach((update) => {
        nextOffset = Math.max(nextOffset || 0, update.update_id + 1);
        if (update.message?.text) mergeMessage(update.message, 'incoming');
      });
      offsetRef.current = nextOffset;
      if (nextOffset !== offset) setOffset(nextOffset);
      setConnectionStatus('connected');
      setError('');
    } catch (requestError) {
      setConnectionStatus('error');
      setError(requestError instanceof Error ? requestError.message : 'Не удалось получить сообщения.');
    } finally {
      pollingRef.current = false;
      if (isManualRefresh) setIsRefreshing(false);
    }
  }, [mergeMessage, offset, profile]);

  useEffect(() => {
    if (!profile) return undefined;
    readUpdates();
    const timer = window.setInterval(readUpdates, 3000);
    return () => window.clearInterval(timer);
  }, [profile, readUpdates]);

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const tokenValue = new FormData(event.currentTarget).get('token');
    const nextToken = typeof tokenValue === 'string' ? tokenValue.trim() : '';
    if (!nextToken) return;
    setError('');
    setIsConnecting(true);
    setConnectionStatus('connecting');
    try {
      const bot = await telegramApi.connect(nextToken);
      chatSession.clear();
      offsetRef.current = null;
      setChats([]);
      setMessages({});
      setSelectedChatId(null);
      setOffset(null);
      setProfile(bot);
      setConnectionStatus('connected');
      setShowSettings(false);
    } catch (requestError) {
      setConnectionStatus('error');
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
      const message = await telegramApi.sendMessage(selectedChat.id, messageDraft);
      mergeMessage(message, 'outgoing');
      setMessageDraft('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось отправить сообщение.');
    } finally {
      setIsSending(false);
    }
  }

  async function disconnect() {
    await telegramApi.disconnect().catch(() => undefined);
    chatSession.clear();
    offsetRef.current = null;
    setProfile(null);
    setChats([]);
    setMessages({});
    setSelectedChatId(null);
    setOffset(null);
    setConnectionStatus('disconnected');
    setShowSettings(false);
    setError('');
  }

  return (
    <main className="app-shell">
      <ChatSidebar profile={profile} chats={chats} selectedChatId={selectedChatId} connectionStatus={connectionStatus} isRefreshing={isRefreshing} onSelect={setSelectedChatId} onOpenSettings={() => setShowSettings(true)} onOpenNewChat={() => setShowNewChat(true)} onRefresh={() => readUpdates(true)} />
      <section className={`chat-panel ${selectedChat ? 'open' : ''}`}>
        <ChatWindow chat={selectedChat} messages={activeMessages} draft={messageDraft} isSending={isSending} isConnected={Boolean(profile)} connectionStatus={connectionStatus} onDraftChange={setMessageDraft} onSend={sendMessage} onBack={() => setSelectedChatId(null)} onOpenNewChat={() => setShowNewChat(true)} onOpenSettings={() => setShowSettings(true)} />
      </section>
      {error && <div className="toast" role="alert"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Закрыть">×</button></div>}
      {showSettings && <BotConnectDialog profile={profile} onConnect={connect} onClose={() => setShowSettings(false)} onDisconnect={disconnect} isConnecting={isConnecting} />}
      {showNewChat && <AddChatDialog onSubmit={addChat} onClose={() => setShowNewChat(false)} />}
    </main>
  );
}
