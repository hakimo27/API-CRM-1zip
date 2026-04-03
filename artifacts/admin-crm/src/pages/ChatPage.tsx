import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Loader2 } from 'lucide-react';

export default function ChatPage() {
  const qc = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: sessions = [], isLoading } = useQuery<any[]>({
    queryKey: ['chat-sessions'],
    queryFn: () => api.get('/chat/sessions'),
    refetchInterval: 10_000,
  });

  const { data: messages = [] } = useQuery<any[]>({
    queryKey: ['chat-messages', selectedSession?.id],
    queryFn: () => api.get(`/chat/sessions/${selectedSession.id}/messages`),
    enabled: !!selectedSession,
    refetchInterval: 5_000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useMutation({
    mutationFn: (text: string) =>
      api.post(`/chat/sessions/${selectedSession.id}/messages`, { text, senderType: 'operator' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-messages', selectedSession?.id] });
      setMessage('');
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedSession) return;
    sendMessage.mutate(message.trim());
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Sessions list */}
      <div className="w-72 border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="px-4 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Чаты</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-gray-400 px-4">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Нет активных чатов</p>
            </div>
          ) : (
            sessions.map((session: any) => (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  selectedSession?.id === session.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''
                }`}
              >
                <div className="font-medium text-sm text-gray-900 truncate">
                  {session.customerName || `Сессия ${session.id}`}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {session.lastMessage?.text?.slice(0, 40) || 'Нет сообщений'}...
                </div>
                <div className="text-xs text-gray-300 mt-1">
                  {new Date(session.updatedAt || session.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </button>
            ))
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
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
              <div className="font-semibold text-sm text-gray-900">
                {selectedSession.customerName || `Сессия #${selectedSession.id}`}
              </div>
              <div className="text-xs text-gray-400">
                {selectedSession.customerPhone || 'Нет телефона'}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Нет сообщений</div>
              ) : (
                messages.map((msg: any) => {
                  const isOp = msg.senderType === 'operator';
                  return (
                    <div key={msg.id} className={`flex ${isOp ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                        isOp ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                      }`}>
                        <p>{msg.text}</p>
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

            {/* Input */}
            <form onSubmit={handleSend} className="flex gap-2 p-4 border-t border-gray-100">
              <input
                value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Написать сообщение..."
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                type="submit" disabled={!message.trim() || sendMessage.isPending}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50">
                {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
