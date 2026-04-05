import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Activity, MessageSquare, Bell, AlertTriangle, Send, RefreshCw,
  Server, Code2, ShieldCheck, Layers, CheckCircle, XCircle, Clock,
} from 'lucide-react';
import { useState } from 'react';

const LEVEL_BADGE: Record<string, string> = {
  debug: 'bg-gray-100 text-gray-500',
  info:  'bg-blue-100 text-blue-700',
  warn:  'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-600',
  fatal: 'bg-red-200 text-red-800',
};

const STATUS_BADGE: Record<string, string> = {
  sent:      'bg-green-100 text-green-700',
  pending:   'bg-yellow-100 text-yellow-700',
  failed:    'bg-red-100 text-red-600',
  delivered: 'bg-blue-100 text-blue-700',
  success:   'bg-green-100 text-green-700',
  error:     'bg-red-100 text-red-600',
  running:   'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const TABS = [
  { key: 'notifications', label: 'Уведомления',  icon: Bell },
  { key: 'telegram',      label: 'Telegram',      icon: Send },
  { key: 'chat',          label: 'Чат',           icon: MessageSquare },
  { key: 'errors',        label: 'Ошибки',        icon: AlertTriangle },
  { key: 'system',        label: 'Система',       icon: Server },
  { key: 'api',           label: 'API запросы',   icon: Code2 },
  { key: 'audit',         label: 'Аудит',         icon: ShieldCheck },
  { key: 'queue',         label: 'Очередь задач', icon: Layers },
];

// ─── SPINNER ────────────────────────────────────────────────────────────────
function Spinner() {
  return <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
}

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────
function EmptyState({ Icon, text }: { Icon: any; text: string }) {
  return (
    <div className="text-center py-12 text-gray-400">
      <Icon className="w-10 h-10 mx-auto mb-2 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

// ─── NOTIFICATIONS LOG ────────────────────────────────────────────────────────
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
        <select value={channel} onChange={e => setChannel(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Все каналы</option>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="telegram">Telegram</option>
          <option value="push">Push</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Все статусы</option>
          <option value="sent">Отправлено</option>
          <option value="failed">Ошибка</option>
          <option value="pending">В очереди</option>
        </select>
        <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Обновить
        </button>
      </div>
      {isLoading ? <Spinner /> : data.length === 0 ? <EmptyState Icon={Bell} text="Логов уведомлений нет" /> : (
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

// ─── TELEGRAM LOG ─────────────────────────────────────────────────────────────
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
      {isLoading ? <Spinner /> : data.length === 0 ? <EmptyState Icon={Send} text="Telegram логов нет" /> : (
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

// ─── CHAT LOG ─────────────────────────────────────────────────────────────────
function ChatLog() {
  const { data: sessions = [], isLoading } = useQuery<any[]>({
    queryKey: ['chat-sessions-admin'],
    queryFn: () => api.get('/chat/sessions'),
  });

  const STATUS_COLORS: Record<string, string> = {
    open:    'bg-green-100 text-green-700',
    closed:  'bg-gray-100 text-gray-500',
    pending: 'bg-yellow-100 text-yellow-700',
  };

  return isLoading ? <Spinner /> : sessions.length === 0 ? <EmptyState Icon={MessageSquare} text="Чат-сессий нет" /> : (
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
                {s.unreadCount > 0
                  ? <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">{s.unreadCount}</span>
                  : <span className="text-gray-400 text-xs">—</span>}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">{s.updatedAt ? new Date(s.updatedAt).toLocaleString('ru-RU') : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── ERRORS LOG ───────────────────────────────────────────────────────────────
function ErrorsLog() {
  const { data = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['notification-logs-errors'],
    queryFn: () => api.get('/notifications/logs?limit=50&status=failed'),
  });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Обновить
        </button>
      </div>
      {isLoading ? <Spinner /> : data.length === 0 ? <EmptyState Icon={AlertTriangle} text="Ошибок нет" /> : (
        <div className="space-y-2">
          {data.map((log: any) => (
            <div key={log.id} className="p-3 bg-red-50 border border-red-100 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-red-600">{log.channel}</span>
                <span className="text-xs text-gray-400">{log.createdAt ? new Date(log.createdAt).toLocaleString('ru-RU') : ''}</span>
              </div>
              <div className="text-sm text-gray-700">{log.message || log.body || '—'}</div>
              {log.error && <div className="text-xs text-red-600 mt-1 font-mono break-all">{log.error}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SYSTEM LOG ───────────────────────────────────────────────────────────────
function SystemLog() {
  const { data = [], isLoading, refetch, isError } = useQuery<any[]>({
    queryKey: ['system-logs'],
    queryFn: () => api.get('/system/logs?limit=100').catch(() => []),
    retry: false,
  });

  const events = Array.isArray(data) ? data : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">Системные события платформы: запуск, остановка, ошибки конфигурации</div>
        <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Обновить
        </button>
      </div>
      {isLoading ? <Spinner /> : (isError || events.length === 0) ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <Server className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-500 mb-1">Системных событий нет</p>
          <p className="text-sm text-gray-400">Логи сервера появятся здесь после включения системного журнала</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {events.map((e: any, i: number) => (
            <div key={e.id || i} className="flex items-start gap-3 px-4 py-2.5 rounded-xl bg-gray-50 text-sm">
              <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-mono font-semibold flex-shrink-0 ${LEVEL_BADGE[e.level] || LEVEL_BADGE.info}`}>{(e.level || 'INFO').toUpperCase()}</span>
              <span className="text-gray-500 text-xs whitespace-nowrap">{e.timestamp ? new Date(e.timestamp).toLocaleString('ru-RU') : ''}</span>
              <span className="text-gray-800">{e.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── API LOG ──────────────────────────────────────────────────────────────────
function ApiLog() {
  const { data = [], isLoading, refetch, isError } = useQuery<any[]>({
    queryKey: ['api-logs'],
    queryFn: () => api.get('/system/api-logs?limit=100').catch(() => []),
    retry: false,
  });

  const entries = Array.isArray(data) ? data : [];

  const methodColor: Record<string, string> = {
    GET:    'bg-green-100 text-green-700',
    POST:   'bg-blue-100 text-blue-700',
    PUT:    'bg-yellow-100 text-yellow-700',
    PATCH:  'bg-orange-100 text-orange-700',
    DELETE: 'bg-red-100 text-red-700',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">Входящие HTTP-запросы к API сервера</div>
        <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Обновить
        </button>
      </div>
      {isLoading ? <Spinner /> : (isError || entries.length === 0) ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <Code2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-500 mb-1">API логов нет</p>
          <p className="text-sm text-gray-400">Здесь будут отображаться HTTP запросы после подключения журнала запросов</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Время</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Метод</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Время (мс)</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((e: any, i: number) => (
                <tr key={e.id || i} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">{e.timestamp ? new Date(e.timestamp).toLocaleString('ru-RU') : '—'}</td>
                  <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${methodColor[e.method] || 'bg-gray-100 text-gray-600'}`}>{e.method}</span></td>
                  <td className="px-4 py-2 text-xs text-gray-700 font-mono max-w-xs truncate">{e.url}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-bold ${e.status >= 400 ? 'text-red-600' : e.status >= 300 ? 'text-yellow-600' : 'text-green-600'}`}>{e.status}</span>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">{e.duration ? `${e.duration}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────
function AuditLog() {
  const { data = [], isLoading, refetch, isError } = useQuery<any[]>({
    queryKey: ['audit-logs'],
    queryFn: () => api.get('/audit-logs?limit=100').catch(() => []),
    retry: false,
  });

  const entries = Array.isArray(data) ? data : [];

  const actionColor: Record<string, string> = {
    create: 'bg-green-100 text-green-700',
    update: 'bg-blue-100 text-blue-700',
    delete: 'bg-red-100 text-red-700',
    login:  'bg-purple-100 text-purple-700',
    logout: 'bg-gray-100 text-gray-600',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">Действия пользователей и менеджеров в системе</div>
        <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Обновить
        </button>
      </div>
      {isLoading ? <Spinner /> : (isError || entries.length === 0) ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-500 mb-1">Журнал аудита пуст</p>
          <p className="text-sm text-gray-400">Сюда записываются критические действия: изменения ролей, удаления, изменения настроек</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Пользователь</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действие</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Объект</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Детали</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((e: any, i: number) => (
                <tr key={e.id || i} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{e.createdAt ? new Date(e.createdAt).toLocaleString('ru-RU') : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{e.userEmail || e.userName || '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionColor[e.action] || 'bg-gray-100 text-gray-600'}`}>{e.action}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-600">{e.entity ? `${e.entity}${e.entityId ? ` #${e.entityId}` : ''}` : '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{e.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── QUEUE LOG ────────────────────────────────────────────────────────────────
function QueueLog() {
  const { data = [], isLoading, refetch, isError } = useQuery<any[]>({
    queryKey: ['queue-jobs'],
    queryFn: () => api.get('/system/jobs?limit=50').catch(() => []),
    retry: false,
  });

  const jobs = Array.isArray(data) ? data : [];

  const stats = {
    total:     jobs.length,
    running:   jobs.filter((j: any) => j.status === 'running').length,
    completed: jobs.filter((j: any) => j.status === 'completed').length,
    failed:    jobs.filter((j: any) => j.status === 'failed').length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">Фоновые задачи: отправка уведомлений, синхронизация с Telegram, обработка платежей</div>
        <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Обновить
        </button>
      </div>

      {!isLoading && !isError && stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Всего',      value: stats.total,     icon: Layers,       color: 'text-gray-700 bg-gray-50' },
            { label: 'Выполняется', value: stats.running,  icon: Clock,        color: 'text-blue-700 bg-blue-50' },
            { label: 'Завершено',  value: stats.completed, icon: CheckCircle,  color: 'text-green-700 bg-green-50' },
            { label: 'Ошибки',     value: stats.failed,    icon: XCircle,      color: 'text-red-700 bg-red-50' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`rounded-xl p-4 ${color} border border-current/10`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{label}</span>
              </div>
              <div className="text-2xl font-bold">{value}</div>
            </div>
          ))}
        </div>
      )}

      {isLoading ? <Spinner /> : (isError || jobs.length === 0) ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <Layers className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-500 mb-1">Задач в очереди нет</p>
          <p className="text-sm text-gray-400">Фоновые задачи появляются при обработке заказов, рассылке уведомлений и синхронизации данных</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Задача</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Попыток</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Запущена</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Завершена</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {jobs.map((job: any, i: number) => (
                <tr key={job.id || i} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{job.name || job.type || '—'}</div>
                    {job.data && <div className="text-xs text-gray-400 truncate max-w-xs">{typeof job.data === 'string' ? job.data : JSON.stringify(job.data)}</div>}
                  </td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[job.status] || 'bg-gray-100 text-gray-500'}`}>{job.status}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-600">{job.attempts ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{job.startedAt ? new Date(job.startedAt).toLocaleString('ru-RU') : '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{job.finishedAt ? new Date(job.finishedAt).toLocaleString('ru-RU') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function LogsPage() {
  const [activeTab, setActiveTab] = useState('notifications');

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
        <div className="flex gap-0.5 p-1.5 min-w-max">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === key ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}>
              <Icon className="w-4 h-4 flex-shrink-0" />{label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        {activeTab === 'notifications' && <NotificationsLog />}
        {activeTab === 'telegram'      && <TelegramLog />}
        {activeTab === 'chat'          && <ChatLog />}
        {activeTab === 'errors'        && <ErrorsLog />}
        {activeTab === 'system'        && <SystemLog />}
        {activeTab === 'api'           && <ApiLog />}
        {activeTab === 'audit'         && <AuditLog />}
        {activeTab === 'queue'         && <QueueLog />}
      </div>
    </div>
  );
}
