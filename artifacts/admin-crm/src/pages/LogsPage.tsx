import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Activity, MessageSquare, Bell, AlertTriangle, Send, RefreshCw } from 'lucide-react';
import { useState } from 'react';

const LEVEL_BADGE: Record<string, string> = {
  debug: 'bg-gray-100 text-gray-500',
  info: 'bg-blue-100 text-blue-700',
  warn: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-600',
  fatal: 'bg-red-200 text-red-800',
};

const LEVEL_LABELS: Record<string, string> = {
  debug: 'DEBUG', info: 'INFO', warn: 'WARN', error: 'ERROR', fatal: 'FATAL',
};

const STATUS_BADGE: Record<string, string> = {
  sent: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-600',
  delivered: 'bg-blue-100 text-blue-700',
};

const TABS = [
  { key: 'notifications', label: 'Уведомления', icon: Bell },
  { key: 'telegram', label: 'Telegram', icon: Send },
  { key: 'chat', label: 'Чат', icon: MessageSquare },
  { key: 'errors', label: 'Ошибки', icon: AlertTriangle },
];

function NotificationsLog() {
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');

  const { data = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['notification-logs', channel, status],
    queryFn: () => api.get(`/notifications/logs?limit=100${channel ? `&channel=${channel}` : ''}${status ? `&status=${status}` : ''}`),
  });

  return (
    <div>
      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={channel} onChange={e => setChannel(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Все каналы</option>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="telegram">Telegram</option>
          <option value="push">Push</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Все статусы</option>
          <option value="sent">Отправлено</option>
          <option value="failed">Ошибка</option>
          <option value="pending">В очереди</option>
        </select>
        <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Обновить
        </button>
      </div>
      {isLoading ? <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        : data.length === 0 ? <div className="text-center py-8 text-gray-400"><Bell className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Логов нет</p></div>
        : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Канал</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Получатель</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сообщение</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {data.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{log.createdAt ? new Date(log.createdAt).toLocaleString('ru-RU') : '—'}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{log.channel}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-600">{log.recipient || log.recipientEmail || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[log.status] || 'bg-gray-100 text-gray-500'}`}>{log.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[300px] truncate">{log.message || log.body || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

function TelegramLog() {
  const { data = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['notification-logs-telegram'],
    queryFn: () => api.get('/notifications/logs?limit=100&channel=telegram'),
  });

  const { data: sessions = [] } = useQuery<any[]>({
    queryKey: ['telegram-sessions'],
    queryFn: () => api.get('/telegram/sessions'),
  });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Обновить
        </button>
      </div>
      {sessions.length > 0 && (
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 mb-3 text-sm">Активные сессии Telegram</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mb-4">
            {sessions.map((s: any) => (
              <div key={s.id} className="bg-blue-50 rounded-xl p-3">
                <div className="text-sm font-medium text-blue-900">{s.username || s.firstName || 'Неизвестный'}</div>
                <div className="text-xs text-blue-600 mt-1">Chat ID: {s.telegramChatId}</div>
                {s.topicId && <div className="text-xs text-blue-500">Topic: {s.topicId}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
      {isLoading ? <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        : data.length === 0 ? <div className="text-center py-8 text-gray-400"><Send className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Telegram логов нет</p></div>
        : (
          <div className="space-y-2">
            {data.map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_BADGE[log.status] || 'bg-gray-100 text-gray-500'}`}>{log.status}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 mb-1">{log.createdAt ? new Date(log.createdAt).toLocaleString('ru-RU') : ''} · {log.recipient || '—'}</div>
                  <div className="text-sm text-gray-700 truncate">{log.message || log.body || '—'}</div>
                  {log.error && <div className="text-xs text-red-500 mt-1">{log.error}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

function ChatLog() {
  const { data: sessions = [], isLoading } = useQuery<any[]>({
    queryKey: ['chat-sessions-admin'],
    queryFn: () => api.get('/chat/sessions'),
  });

  const STATUS_COLORS: Record<string, string> = {
    open: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-500',
    pending: 'bg-yellow-100 text-yellow-700',
  };

  return isLoading ? <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
    : sessions.length === 0 ? <div className="text-center py-8 text-gray-400"><MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Чат-сессий нет</p></div>
    : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Клиент</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Канал</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Непрочит.</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Последнее</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {sessions.map((s: any) => (
              <tr key={s.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{s.visitorName || s.customerName || 'Аноним'}</div>
                  {s.visitorEmail && <div className="text-xs text-gray-400">{s.visitorEmail}</div>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{s.channel || 'web'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-500'}`}>{s.status}</span></td>
                <td className="px-4 py-3">
                  {s.unreadCount > 0 ? <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">{s.unreadCount}</span> : <span className="text-gray-400 text-xs">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{s.updatedAt ? new Date(s.updatedAt).toLocaleString('ru-RU') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
}

function ErrorsLog() {
  const [level, setLevel] = useState('error');
  const { data = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['notification-logs-errors', level],
    queryFn: () => api.get(`/notifications/logs?limit=50&status=failed`),
  });

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <select value={level} onChange={e => setLevel(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="error">Ошибки</option>
          <option value="warn">Предупреждения</option>
          <option value="all">Все</option>
        </select>
        <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Обновить
        </button>
      </div>
      {isLoading ? <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        : data.length === 0 ? <div className="text-center py-8 text-gray-400"><AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Ошибок нет</p></div>
        : (
          <div className="space-y-2">
            {data.map((log: any) => (
              <div key={log.id} className="p-3 bg-red-50 border border-red-100 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-red-600">{log.channel}</span>
                  <span className="text-xs text-gray-400">{log.createdAt ? new Date(log.createdAt).toLocaleString('ru-RU') : ''}</span>
                </div>
                <div className="text-sm text-gray-700">{log.message || log.body || '—'}</div>
                {log.error && <div className="text-xs text-red-600 mt-1 font-mono">{log.error}</div>}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState('notifications');

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-1 flex gap-1 flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium flex-1 justify-center transition-colors ${activeTab === key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        {activeTab === 'notifications' && <NotificationsLog />}
        {activeTab === 'telegram' && <TelegramLog />}
        {activeTab === 'chat' && <ChatLog />}
        {activeTab === 'errors' && <ErrorsLog />}
      </div>
    </div>
  );
}
