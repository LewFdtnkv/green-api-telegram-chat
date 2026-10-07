import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { telegramApi } from '../../../shared/api/telegram';
import { chatSession } from '../../../shared/lib/chatSession';
import { tokenSession } from '../../../shared/lib/session';
import type { ChatId, ChatSummary, MessagesByChat, TelegramBot, TelegramMessage } from '../../../entities/telegram/model/types';
import { createManualChat, upsertChat } from '../../../entities/chat/lib/chat';
import { appendMessage } from '../../../entities/message/lib/message';
import { BotConnectDialog } from '../../../features/connect-bot/ui/BotConnectDialog';
import { AddChatDialog } from '../../../features/add-chat/ui/AddChatDialog';
import { ChatSidebar } from '../../../widgets/chat-sidebar/ui/ChatSidebar';
import { ChatWindow } from '../../../widgets/chat-window/ui/ChatWindow';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export function TelegramChatPage() {
  const [token, setToken] = useState<string>(tokenSession.get);
  const [initialChatSession] = useState(() => chatSession.get());
  const [profile, setProfile] = useState<TelegramBot | null>(null);
  const [chats, setChats] = useState<ChatSummary[]>(initialChatSession.chats);
  const [messages, setMessages] = useState<MessagesByChat>(initialChatSession.messages);
  const [selectedChatId, setSelectedChatId] = useState<ChatId | null>(initialChatSession.selectedChatId);
  const [offset, setOffset] = useState<number | null>(initialChatSession.offset);
  const [messageDraft, setMessageDraft] = useState('');
  const [showSettings, setShowSettings] = useState(() => !tokenSession.get());
  const [showNewChat, setShowNewChat] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(() => tokenSession.get() ? 'connecting' : 'disconnected');
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
    if (!token || profile) return;
    let isActive = true;
    setConnectionStatus('connecting');

    telegramApi.getProfile(token)
      .then((bot) => {
        if (!isActive) return;
        setProfile(bot);
        setConnectionStatus('connected');
      })
      .catch((requestError) => {
        if (!isActive) return;
        setConnectionStatus('error');
        setError(requestError instanceof Error ? requestError.message : 'Не удалось восстановить подключение бота.');
      });

    return () => { isActive = false; };
  }, [profile, token]);

  const readUpdates = useCallback(async () => {
    if (!token || !profile || pollingRef.current) return;
    pollingRef.current = true;
    setIsPolling(true);
    try {
      const updates = await telegramApi.getUpdates(token, offsetRef.current);
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
      setIsPolling(false);
    }
  }, [mergeMessage, offset, profile, token]);

  useEffect(() => {
    if (!token || !profile) return undefined;
    readUpdates();
    const timer = window.setInterval(readUpdates, 5000);
    return () => window.clearInterval(timer);
  }, [profile, readUpdates, token]);

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const tokenValue = new FormData(event.currentTarget).get('token');
    const nextToken = typeof tokenValue === 'string' ? tokenValue.trim() : '';
    if (!nextToken) return;
    setError('');
    setIsConnecting(true);
    setConnectionStatus('connecting');
    try {
      const bot = await telegramApi.getProfile(nextToken);
      if (nextToken !== token) {
        chatSession.clear();
        offsetRef.current = null;
        setChats([]);
        setMessages({});
        setSelectedChatId(null);
        setOffset(null);
      }
      tokenSession.set(nextToken);
      setToken(nextToken);
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
    chatSession.clear();
    offsetRef.current = null;
    setToken('');
    setProfile(null);
    setChats([]);
    setMessages({});
    setSelectedChatId(null);
    setOffset(null);
    setConnectionStatus('disconnected');
    setShowSettings(true);
    setError('');
  }

  return (
    <main className="app-shell">
      <ChatSidebar profile={profile} chats={chats} selectedChatId={selectedChatId} connectionStatus={connectionStatus} isPolling={isPolling} onSelect={setSelectedChatId} onOpenSettings={() => setShowSettings(true)} onOpenNewChat={() => setShowNewChat(true)} onRefresh={readUpdates} />
      <section className={`chat-panel ${selectedChat ? 'open' : ''}`}>
        <ChatWindow chat={selectedChat} messages={activeMessages} draft={messageDraft} isSending={isSending} isConnected={Boolean(token)} isPolling={isPolling} connectionStatus={connectionStatus} onDraftChange={setMessageDraft} onSend={sendMessage} onBack={() => setSelectedChatId(null)} onOpenNewChat={() => setShowNewChat(true)} onOpenSettings={() => setShowSettings(true)} />
      </section>
      {error && <div className="toast" role="alert"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Закрыть">×</button></div>}
      {showSettings && <BotConnectDialog profile={profile} token={token} onConnect={connect} onClose={() => setShowSettings(false)} onDisconnect={disconnect} isConnecting={isConnecting} />}
      {showNewChat && <AddChatDialog onSubmit={addChat} onClose={() => setShowNewChat(false)} />}
    </main>
  );
}
