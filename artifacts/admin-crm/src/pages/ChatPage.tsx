import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Loader2, RefreshCw, X } from 'lucide-react';

type FilterTab = 'open' | 'closed' | 'all';

const TAB_LABELS: Record<FilterTab, string> = {
  open: 'Открытые',
  closed: 'Закрытые',
  all: 'Все',
};

export default function ChatPage() {
  const qc = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<FilterTab>('open');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: sessions = [], isLoading, dataUpdatedAt } = useQuery<any[]>({
    queryKey: ['chat-sessions', 'all'],
    queryFn: () => api.get('/chat/sessions'),
    refetchInterval: 5_000,
    staleTime: 3_000,
  });

  const prevSessionCountRef = useRef<number | null>(null);
  const [newSessionAlert, setNewSessionAlert] = useState(false);

  useEffect(() => {
    const openCount = sessions.filter((s: any) => s.status === 'open').length;
    const prev = prevSessionCountRef.current;
    if (prev !== null && openCount > prev) {
      setNewSessionAlert(true);
    }
    prevSessionCountRef.current = openCount;
  }, [dataUpdatedAt]);

  const filtered = sessions.filter(s => {
    if (tab === 'open') return s.status === 'open';
    if (tab === 'closed') return s.status === 'closed' || s.status === 'resolved' || s.status === 'archived';
    return true;
  });

  const openCount = sessions.filter(s => s.status === 'open').length;
  const unreadCount = sessions.filter(s => s.status === 'open' && s.unreadCount > 0).length;

  const { data: messages = [] } = useQuery<any[]>({
    queryKey: ['chat-messages', selectedSession?.id],
    queryFn: () => api.get(`/chat/sessions/${selectedSession.id}/messages`),
    enabled: !!selectedSession,
    refetchInterval: 4_000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const markAsRead = useMutation({
    mutationFn: (id: number) => api.patch(`/chat/sessions/${id}/read`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-sessions'] });
      qc.invalidateQueries({ queryKey: ['crm-counts'] });
    },
  });

  const handleDismissAlert = () => {
    setNewSessionAlert(false);
    setTab('open');
  };

  const handleSelectSession = (session: any) => {
    setSelectedSession(session);
    if (session.unreadCount > 0) {
      markAsRead.mutate(session.id);
    }
  };

  const sendMessage = useMutation({
    mutationFn: (text: string) =>
      api.post(`/chat/sessions/${selectedSession.id}/messages`, {
        content: text,
        sender: 'manager',
      }),
    onSuccess: (newSession: any) => {
      qc.invalidateQueries({ queryKey: ['chat-messages', selectedSession?.id] });
      qc.invalidateQueries({ queryKey: ['chat-sessions', 'all'] });
      setMessage('');
      if (newSession) {
        setSelectedSession((prev: any) => ({ ...prev, status: 'open' }));
      }
    },
  });

  const closeSession = useMutation({
    mutationFn: (id: number) =>
      api.patch(`/chat/sessions/${id}/status`, { status: 'closed' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-sessions', 'all'] });
      qc.invalidateQueries({ queryKey: ['crm-counts'] });
      setSelectedSession((prev: any) => prev ? { ...prev, status: 'closed' } : null);
    },
  });

  const reopenSession = useMutation({
    mutationFn: (id: number) =>
      api.patch(`/chat/sessions/${id}/status`, { status: 'open' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-sessions', 'all'] });
      setSelectedSession((prev: any) => prev ? { ...prev, status: 'open' } : null);
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedSession) return;
    sendMessage.mutate(message.trim());
  };

  function getContactLine(session: any): string {
    const meta = session.metadata as Record<string, unknown> | null;
    const phone = (meta?.phone as string) || '';
    const email = (meta?.email as string) || '';
    return [phone, email].filter(Boolean).join(' · ') || 'Нет контактов';
  }

  const isClosed = selectedSession && selectedSession.status !== 'open';

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Sessions list */}
      <div className="w-72 border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="px-4 py-4 border-b border-gray-100">
          {newSessionAlert && (
            <button
              onClick={handleDismissAlert}
              className="w-full mb-3 flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-700 font-medium hover:bg-orange-100 transition-colors animate-pulse"
            >
              <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
              Новый диалог — нажмите, чтобы посмотреть
              <X className="w-3.5 h-3.5 ml-auto flex-shrink-0" onClick={e => { e.stopPropagation(); setNewSessionAlert(false); }} />
            </button>
          )}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Чаты</h2>
            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-medium">
                  {unreadCount} новых
                </span>
              )}
              {openCount > 0 && unreadCount === 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {openCount}
                </span>
              )}
            </div>
          </div>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['open', 'closed', 'all'] as FilterTab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 text-xs py-1.5 transition-colors ${
                  tab === t ? 'bg-blue-600 text-white font-medium' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 px-4">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                {tab === 'open' ? 'Нет активных чатов' : tab === 'closed' ? 'Нет закрытых чатов' : 'Нет чатов'}
              </p>
            </div>
          ) : (
            filtered.map((session: any) => {
              const isOpen = session.status === 'open';
              const hasUnread = session.unreadCount > 0;
              const isSelected = selectedSession?.id === session.id;
              return (
                <button
                  key={session.id}
                  onClick={() => handleSelectSession(session)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''
                  } ${hasUnread && !isSelected ? 'bg-amber-50/50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-1 mb-0.5">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {session.customerName || `Диалог #${session.id}`}
                    </div>
                    {hasUnread && (
                      <span className="flex-shrink-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {session.unreadCount > 9 ? '9+' : session.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 truncate mb-1">
                    {getContactLine(session)}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOpen ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-xs text-gray-400">
                      {isOpen ? 'открыт' : 'закрыт'}
                    </span>
                    <span className="text-xs text-gray-300 ml-auto">
                      {new Date(session.updatedAt || session.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedSession ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-3 opacity-20" />
              <p>Выберите чат</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                  {selectedSession.customerName || `Диалог #${selectedSession.id}`}
                  {isClosed && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-normal">закрыт</span>
                  )}
                </div>
                <div className="text-xs text-gray-400">{getContactLine(selectedSession)}</div>
              </div>
              <div className="flex items-center gap-2">
                {isClosed ? (
                  <button
                    onClick={() => reopenSession.mutate(selectedSession.id)}
                    disabled={reopenSession.isPending}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 bg-blue-50 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                  >
                    {reopenSession.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Переоткрыть
                  </button>
                ) : (
                  <button
                    onClick={() => closeSession.mutate(selectedSession.id)}
                    disabled={closeSession.isPending}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                  >
                    {closeSession.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    Закрыть диалог
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Нет сообщений</div>
              ) : (
                messages.map((msg: any) => {
                  const isOp = msg.sender === 'manager';
                  const isBot = msg.sender === 'bot';
                  return (
                    <div key={msg.id} className={`flex ${isOp ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                        isOp
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : isBot
                            ? 'bg-gray-100 text-gray-600 rounded-bl-sm italic'
                            : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                      }`}>
                        {isBot && <div className="text-xs text-gray-400 mb-1">Бот</div>}
                        <p>{msg.content}</p>
                        <div className={`text-xs mt-1 ${isOp ? 'text-blue-200' : 'text-gray-400'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            {isClosed ? (
              <div className="p-4 border-t border-gray-100 bg-white">
                <div className="flex items-center gap-3 text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">
                  <MessageSquare className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  <span>Диалог закрыт. Если клиент напишет снова, он автоматически переоткроется.</span>
                  <button
                    onClick={() => reopenSession.mutate(selectedSession.id)}
                    disabled={reopenSession.isPending}
                    className="ml-auto text-xs text-blue-600 hover:underline flex-shrink-0 disabled:opacity-50"
                  >
                    Переоткрыть вручную
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSend} className="flex gap-2 p-4 border-t border-gray-100 bg-white">
                <input
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend(e as any)}
                  placeholder="Написать сообщение..."
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  type="submit"
                  disabled={!message.trim() || sendMessage.isPending}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
