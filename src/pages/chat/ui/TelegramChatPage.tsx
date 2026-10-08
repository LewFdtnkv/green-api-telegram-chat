import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, greenApi } from '../../../shared/api/greenApi';
import { chatSession } from '../../../shared/lib/chatSession';
import { telegramQueryKeys, useTelegramSession, useTelegramUpdates } from '../../../entities/telegram/api/telegramQueries';
import type { ChatId, ChatSummary, MessagesByChat, TelegramMessage } from '../../../entities/telegram/model/types';
import { createManualChat, upsertChat } from '../../../entities/chat/lib/chat';
import { appendMessage } from '../../../entities/message/lib/message';
import { BotConnectDialog } from '../../../features/connect-bot/ui/BotConnectDialog';
import { AddChatDialog } from '../../../features/add-chat/ui/AddChatDialog';
import { ChatSidebar } from '../../../widgets/chat-sidebar/ui/ChatSidebar';
import { ChatWindow } from '../../../widgets/chat-window/ui/ChatWindow';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

function isUnauthorized(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 401;
}

export function TelegramChatPage() {
  const [initialChatSession] = useState(() => chatSession.get());
  const [chats, setChats] = useState<ChatSummary[]>(initialChatSession.chats);
  const [messages, setMessages] = useState<MessagesByChat>(initialChatSession.messages);
  const [selectedChatId, setSelectedChatId] = useState<ChatId | null>(initialChatSession.selectedChatId);
  const [messageDraft, setMessageDraft] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [isSessionAvailable, setIsSessionAvailable] = useState(true);
  const queryClient = useQueryClient();
  const sessionQuery = useTelegramSession(isSessionAvailable);
  const profile = isSessionAvailable ? sessionQuery.data ?? null : null;
  const updatesQuery = useTelegramUpdates(Boolean(profile));

  const selectedChat = chats.find((chat) => String(chat.id) === String(selectedChatId)) || null;
  const activeMessages = useMemo(
    () => [...(messages[String(selectedChatId)] || [])].sort((left, right) => left.date - right.date),
    [messages, selectedChatId]
  );

  const mergeMessage = useCallback((message: TelegramMessage, direction: 'incoming' | 'outgoing') => {
    setChats((current) => upsertChat(current, message, direction));
    setMessages((current) => appendMessage(current, message, direction));
  }, []);

  const expireSession = useCallback(() => {
    setIsSessionAvailable(false);
    queryClient.removeQueries({ queryKey: telegramQueryKeys.updates });
    setShowSettings(true);
  }, [queryClient]);

  const connectMutation = useMutation({
    mutationFn: ({ apiUrl, idInstance, apiTokenInstance }: { apiUrl: string; idInstance: string; apiTokenInstance: string }) => greenApi.connect(apiUrl, idInstance, apiTokenInstance),
    onSuccess: (instance) => {
      queryClient.setQueryData(telegramQueryKeys.session, instance);
      queryClient.removeQueries({ queryKey: telegramQueryKeys.updates });
      chatSession.clear();
      setIsSessionAvailable(true);
      setChats([]);
      setMessages({});
      setSelectedChatId(null);
      setError('');
      setShowSettings(false);
    },
    onError: (requestError) => {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось подключить инстанс GREEN-API.');
    }
  });

  const sendMutation = useMutation({
    mutationFn: ({ chatId, text }: { chatId: ChatId; text: string }) => greenApi.sendMessage(chatId, text),
    onSuccess: (message) => {
      mergeMessage(message, 'outgoing');
      setMessageDraft('');
      setError('');
    },
    onError: (requestError) => {
      if (isUnauthorized(requestError)) {
        expireSession();
        return;
      }
      setError(requestError instanceof Error ? requestError.message : 'Не удалось отправить сообщение.');
    }
  });

  const disconnectMutation = useMutation({ mutationFn: greenApi.disconnect });

  useEffect(() => {
    chatSession.set({ chats, messages, selectedChatId });
  }, [chats, messages, selectedChatId]);

  useEffect(() => {
    if (!sessionQuery.error) return;
    if (isUnauthorized(sessionQuery.error)) {
      expireSession();
      return;
    }
    setError(sessionQuery.error instanceof Error ? sessionQuery.error.message : 'Не удалось восстановить подключение бота.');
  }, [expireSession, sessionQuery.error]);

  useEffect(() => {
    if (!updatesQuery.data?.length) return;
    updatesQuery.data.forEach((update) => {
      if (update.message?.text) mergeMessage(update.message, 'incoming');
    });
    setError('');
  }, [mergeMessage, updatesQuery.data]);

  useEffect(() => {
    if (!updatesQuery.error) return;
    if (isUnauthorized(updatesQuery.error)) {
      expireSession();
      return;
    }
    setError(updatesQuery.error instanceof Error ? updatesQuery.error.message : 'Не удалось получить сообщения.');
  }, [expireSession, updatesQuery.error]);

  const connectionStatus: ConnectionStatus = connectMutation.isPending || (isSessionAvailable && sessionQuery.isPending)
    ? 'connecting'
    : profile
      ? 'connected'
      : connectMutation.isError || (isSessionAvailable && Boolean(sessionQuery.error))
        ? 'error'
        : 'disconnected';

  async function refreshUpdates() {
    if (!profile) {
      setShowSettings(true);
      return;
    }
    setIsRefreshing(true);
    await updatesQuery.refetch();
    setIsRefreshing(false);
  }

  function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const apiUrl = formData.get('apiUrl');
    const idInstance = formData.get('idInstance');
    const apiTokenInstance = formData.get('apiTokenInstance');
    if (typeof apiUrl !== 'string' || typeof idInstance !== 'string' || typeof apiTokenInstance !== 'string' || !apiUrl.trim() || !idInstance.trim() || !apiTokenInstance.trim()) return;
    setError('');
    connectMutation.mutate({ apiUrl: apiUrl.trim(), idInstance: idInstance.trim(), apiTokenInstance: apiTokenInstance.trim() });
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

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !selectedChat || !messageDraft.trim() || sendMutation.isPending) return;
    setError('');
    sendMutation.mutate({ chatId: selectedChat.id, text: messageDraft });
  }

  function disconnect() {
    disconnectMutation.mutate();
    queryClient.removeQueries({ queryKey: telegramQueryKeys.session });
    queryClient.removeQueries({ queryKey: telegramQueryKeys.updates });
    chatSession.clear();
    setIsSessionAvailable(false);
    setChats([]);
    setMessages({});
    setSelectedChatId(null);
    setShowSettings(false);
    setError('');
  }

  return (
    <main className="app-shell">
      <ChatSidebar profile={profile} chats={chats} selectedChatId={selectedChatId} connectionStatus={connectionStatus} isRefreshing={isRefreshing} onSelect={setSelectedChatId} onOpenSettings={() => setShowSettings(true)} onOpenNewChat={() => setShowNewChat(true)} onRefresh={refreshUpdates} />
      <section className={`chat-panel ${selectedChat ? 'open' : ''}`}>
        <ChatWindow chat={selectedChat} messages={activeMessages} draft={messageDraft} isSending={sendMutation.isPending} isConnected={Boolean(profile)} connectionStatus={connectionStatus} onDraftChange={setMessageDraft} onSend={sendMessage} onBack={() => setSelectedChatId(null)} onOpenNewChat={() => setShowNewChat(true)} onOpenSettings={() => setShowSettings(true)} />
      </section>
      {error && <div className="toast" role="alert"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Закрыть">×</button></div>}
      {showSettings && <BotConnectDialog profile={profile} onConnect={connect} onClose={() => setShowSettings(false)} onDisconnect={disconnect} isConnecting={connectMutation.isPending} />}
      {showNewChat && <AddChatDialog onSubmit={addChat} onClose={() => setShowNewChat(false)} />}
    </main>
  );
}
