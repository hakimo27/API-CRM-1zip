import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Link, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import {
  User, MessageSquare, ArrowLeft, ShoppingBag,
  Edit2, Check, X, TrendingUp, Package, AlertCircle, Store, Tent,
  Star, FileText, Clock,
} from 'lucide-react';
import { PhoneInput } from '@/components/PhoneInput';

const STATUS_BADGE: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  open: 'bg-blue-100 text-blue-700',
  closed: 'bg-gray-100 text-gray-600',
  resolved: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
  processing: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  refunded: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  in_progress: 'В работе',
  completed: 'Завершён',
  cancelled: 'Отменён',
  pending: 'Ожидание',
  active: 'Активен',
  open: 'Открыт',
  closed: 'Закрыт',
  resolved: 'Решён',
  archived: 'Архив',
  processing: 'Обработка',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  refunded: 'Возврат',
  approved: 'Одобрен',
  rejected: 'Отклонён',
};

const CHANNEL_LABELS: Record<string, string> = {
  web: 'Веб-сайт',
  phone: 'Телефон',
  telegram: 'Telegram',
  email: 'Email',
  vk: 'ВКонтакте',
  whatsapp: 'WhatsApp',
};

function fmt(date: string | null | undefined) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateTime(date: string | null | undefined) {
  if (!date) return '—';
  return new Date(date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtMoney(val: any) {
  const n = Number(val);
  if (!n) return '0 ₽';
  return n.toLocaleString('ru-RU') + ' ₽';
}

interface EditableFieldProps {
  label: string;
  value: string;
  onSave: (v: string) => void;
  type?: 'text' | 'email' | 'phone';
}
function EditableField({ label, value, onSave, type = 'text' }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const cls = "flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  return (
    <div className="flex items-center gap-2 min-h-[28px]">
      <span className="text-xs text-gray-400 w-24 flex-shrink-0">{label}</span>
      {editing ? (
        <div className="flex items-center gap-1 flex-1">
          {type === 'phone' ? (
            <PhoneInput value={draft} onChange={setDraft} className={cls} />
          ) : (
            <input type={type} value={draft} onChange={e => setDraft(e.target.value)} className={cls} />
          )}
          <button onClick={() => { onSave(draft); setEditing(false); }} className="p-1 text-green-600 hover:bg-green-50 rounded">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => { setDraft(value); setEditing(false); }} className="p-1 text-red-500 hover:bg-red-50 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 flex-1 group">
          <span className="text-sm text-gray-800">{value || <span className="text-gray-400 italic text-xs">не указано</span>}</span>
          <button onClick={() => { setDraft(value); setEditing(true); }} className="ml-1 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            <Edit2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

type TabKey = 'rentals' | 'purchases' | 'tours' | 'reviews' | 'requests' | 'chats';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'rentals', label: 'Аренды', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
  { key: 'purchases', label: 'Покупки', icon: <Store className="w-3.5 h-3.5" /> },
  { key: 'tours', label: 'Туры', icon: <Tent className="w-3.5 h-3.5" /> },
  { key: 'reviews', label: 'Отзывы', icon: <Star className="w-3.5 h-3.5" /> },
  { key: 'requests', label: 'Заявки', icon: <FileText className="w-3.5 h-3.5" /> },
  { key: 'chats', label: 'Чаты', icon: <MessageSquare className="w-3.5 h-3.5" /> },
];

export default function CustomerDetailPage({ id }: { id: string }) {
  const customerId = parseInt(id, 10);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('rentals');

  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => api.get(`/customers/${customerId}`),
    enabled: !isNaN(customerId),
  });

  const updateMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/customers/${customerId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', customerId] });
      toast({ title: 'Сохранено', description: 'Данные клиента обновлены' });
    },
    onError: () => toast({ title: 'Ошибка', description: 'Не удалось сохранить', variant: 'destructive' }),
  });

  if (isLoading) return (
    <div className="space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
        <div className="lg:col-span-2 h-64 bg-gray-200 rounded-2xl animate-pulse" />
      </div>
    </div>
  );

  if (error || !customer) return (
    <div className="text-center py-16">
      <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Клиент не найден</h2>
      <Link href="/customers" className="text-blue-600 hover:underline text-sm">← Вернуться к списку</Link>
    </div>
  );

  const stats = customer.stats || { totalOrders: 0, totalRevenue: 0, activeOrders: 0 };
  const orders: any[] = customer.orders || [];
  const saleOrders: any[] = customer.saleOrders || [];
  const tourBookings: any[] = customer.tourBookings || [];
  const reviews: any[] = customer.reviews || [];
  const feedbackReports: any[] = customer.feedbackReports || [];
  const chatSessions: any[] = customer.chatSessions || [];

  const tabCounts: Record<TabKey, number> = {
    rentals: orders.length,
    purchases: saleOrders.length,
    tours: tourBookings.length,
    reviews: reviews.length,
    requests: feedbackReports.length,
    chats: chatSessions.length,
  };

  function EmptyState({ icon, label, hint }: { icon: React.ReactNode; label: string; hint?: string }) {
    return (
      <div className="text-center py-10 text-gray-400">
        <div className="w-10 h-10 mx-auto mb-2 opacity-30">{icon}</div>
        <p className="text-sm">{label}</p>
        {hint && <p className="text-xs mt-1 text-gray-300">{hint}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/customers')} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {customer.name}{customer.lastName ? ' ' + customer.lastName : ''}
          </h1>
          <p className="text-sm text-gray-500">Клиент #{customer.id} · Создан {fmt(customer.createdAt)}</p>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <Link href={`/orders/new?customerId=${customer.id}&customerName=${encodeURIComponent(customer.name)}&customerPhone=${encodeURIComponent(customer.phone || '')}&customerEmail=${encodeURIComponent(customer.email || '')}`}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition-colors">
            <ShoppingBag className="w-4 h-4" /> Аренда
          </Link>
          <Link href={`/sale-orders/new?customerId=${customer.id}&customerName=${encodeURIComponent(customer.name)}&customerPhone=${encodeURIComponent(customer.phone || '')}&customerEmail=${encodeURIComponent(customer.email || '')}`}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700 transition-colors">
            <Store className="w-4 h-4" /> Продажа
          </Link>
          <Link href={`/chat?customerId=${customer.id}`}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-sm rounded-xl hover:bg-gray-50 transition-colors">
            <MessageSquare className="w-4 h-4" /> Написать
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
            <p className="text-xs text-gray-500">Заказов</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{fmtMoney(stats.totalRevenue)}</p>
            <p className="text-xs text-gray-500">Выручка</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.activeOrders}</p>
            <p className="text-xs text-gray-500">Активных</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Customer info */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 group">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" /> Контактные данные
            </h3>
            <div className="space-y-3">
              <EditableField label="Имя" value={customer.name || ''} onSave={v => updateMut.mutate({ name: v })} />
              <EditableField label="Фамилия" value={customer.lastName || ''} onSave={v => updateMut.mutate({ lastName: v })} />
              <EditableField label="Телефон" value={customer.phone || ''} onSave={v => updateMut.mutate({ phone: v })} type="phone" />
              <EditableField label="Email" value={customer.email || ''} onSave={v => updateMut.mutate({ email: v })} type="email" />
              <EditableField label="Город" value={customer.city || ''} onSave={v => updateMut.mutate({ city: v })} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" /> Канал связи
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-24">Канал</span>
                <span className="text-gray-800">{CHANNEL_LABELS[customer.communicationChannel || ''] || customer.communicationChannel || '—'}</span>
              </div>
              {customer.telegramChatId && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-24">Telegram ID</span>
                  <span className="text-gray-800 font-mono text-xs">{customer.telegramChatId}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-24">Обновлён</span>
                <span className="text-gray-800">{fmt(customer.updatedAt)}</span>
              </div>
            </div>
          </div>

          {customer.notes && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-2">Заметки</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{customer.notes}</p>
            </div>
          )}
        </div>

        {/* Right: History tabs */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-gray-100 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium transition-colors flex-shrink-0 ${
                    activeTab === tab.key
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/40'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tabCounts[tab.key] > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                      activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {tabCounts[tab.key]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-5">

              {/* ── Аренды ── */}
              {activeTab === 'rentals' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 text-sm">История аренды</h3>
                    <Link href={`/orders/new?customerId=${customer.id}&customerName=${encodeURIComponent(customer.name)}`}
                      className="text-xs text-blue-600 hover:underline">+ Новый заказ</Link>
                  </div>
                  {orders.length === 0 ? (
                    <EmptyState icon={<ShoppingBag />} label="Заказов аренды нет" />
                  ) : (
                    <div className="space-y-2">
                      {orders.map((order: any) => (
                        <Link key={order.id} href={`/orders/${order.id}`}
                          className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <ShoppingBag className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Заказ #{order.id}</p>
                              <p className="text-xs text-gray-500">{fmt(order.startDate)} — {fmt(order.endDate)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">{fmtMoney(order.totalAmount)}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[order.status] || 'bg-gray-100 text-gray-600'}`}>
                              {STATUS_LABELS[order.status] || order.status}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── Покупки ── */}
              {activeTab === 'purchases' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 text-sm">История покупок</h3>
                    <Link href={`/sale-orders/new?customerId=${customer.id}&customerName=${encodeURIComponent(customer.name)}`}
                      className="text-xs text-blue-600 hover:underline">+ Новый заказ</Link>
                  </div>
                  {saleOrders.length === 0 ? (
                    <EmptyState icon={<Store />} label="Покупок нет"
                      hint={!customer.email ? 'Для автосвязи покупок укажите email клиента' : undefined} />
                  ) : (
                    <div className="space-y-2">
                      {saleOrders.map((so: any) => (
                        <Link key={so.id} href={`/sale-orders/${so.id}`}
                          className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-green-200 hover:bg-green-50 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Store className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{so.orderNumber || `Заказ #${so.id}`}</p>
                              <p className="text-xs text-gray-500">{fmt(so.createdAt)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">{fmtMoney(so.totalAmount)}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[so.status] || 'bg-gray-100 text-gray-600'}`}>
                              {STATUS_LABELS[so.status] || so.status}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── Туры ── */}
              {activeTab === 'tours' && (
                <>
                  <h3 className="font-semibold text-gray-900 text-sm mb-4">Бронирования туров</h3>
                  {tourBookings.length === 0 ? (
                    <EmptyState icon={<Tent />} label="Бронирований туров нет"
                      hint={!customer.email && !customer.phone ? 'Укажите email или телефон для автосвязи' : undefined} />
                  ) : (
                    <div className="space-y-2">
                      {tourBookings.map((tb: any) => (
                        <div key={tb.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Tent className="w-4 h-4 text-orange-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Бронь #{tb.id}</p>
                              <p className="text-xs text-gray-500">
                                {tb.participantCount} чел. · {fmt(tb.createdAt)}
                              </p>
                              {tb.contactName && <p className="text-xs text-gray-400">{tb.contactName} · {tb.contactPhone}</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">{fmtMoney(tb.totalAmount)}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[tb.status] || 'bg-gray-100 text-gray-600'}`}>
                              {STATUS_LABELS[tb.status] || tb.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── Отзывы ── */}
              {activeTab === 'reviews' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 text-sm">Отзывы клиента</h3>
                    <Link href="/content?tab=reviews" className="text-xs text-blue-600 hover:underline">Все отзывы →</Link>
                  </div>
                  {reviews.length === 0 ? (
                    <EmptyState icon={<Star />} label="Отзывов нет"
                      hint="Отзывы появятся после привязки через ID клиента в форме отзыва" />
                  ) : (
                    <div className="space-y-3">
                      {reviews.map((r: any) => (
                        <div key={r.id} className="p-3 rounded-xl border border-gray-100">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-yellow-500 text-sm">{'★'.repeat(r.rating || 5)}{'☆'.repeat(5 - (r.rating || 5))}</span>
                                {r.title && <span className="text-sm font-medium text-gray-800">{r.title}</span>}
                              </div>
                              <p className="text-xs text-gray-600 line-clamp-2">{r.text?.replace(/<[^>]*>/g, '') || ''}</p>
                              <p className="text-xs text-gray-400 mt-1">{fmt(r.reviewDate || r.createdAt)}</p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-600'}`}>
                              {STATUS_LABELS[r.status] || r.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── Заявки ── */}
              {activeTab === 'requests' && (
                <>
                  <h3 className="font-semibold text-gray-900 text-sm mb-4">Заявки и обращения</h3>
                  {feedbackReports.length === 0 ? (
                    <EmptyState icon={<FileText />} label="Заявок нет"
                      hint={!customer.phone && !customer.email ? 'Укажите телефон или email для поиска заявок' : undefined} />
                  ) : (
                    <div className="space-y-2">
                      {feedbackReports.map((fb: any) => (
                        <div key={fb.id} className="p-3 rounded-xl border border-gray-100">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-gray-700">{fb.name}</span>
                                <span className="text-xs text-gray-400">{fb.contact}</span>
                              </div>
                              <p className="text-xs text-gray-600 line-clamp-2">{fb.message}</p>
                              {fb.pageUrl && <p className="text-xs text-gray-400 mt-1 font-mono truncate">{fb.pageUrl}</p>}
                            </div>
                            <span className="text-xs text-gray-400 flex-shrink-0">{fmt(fb.createdAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── Чаты ── */}
              {activeTab === 'chats' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 text-sm">История диалогов</h3>
                    <Link href="/chat" className="text-xs text-blue-600 hover:underline">Открыть чаты →</Link>
                  </div>
                  {chatSessions.length === 0 ? (
                    <EmptyState icon={<MessageSquare />} label="Диалогов нет" />
                  ) : (
                    <div className="space-y-2">
                      {chatSessions.map((session: any) => (
                        <div key={session.id}
                          className="flex items-start justify-between p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <MessageSquare className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-900">Диалог #{session.id}</p>
                                {session.unreadCount > 0 && (
                                  <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full font-semibold">{session.unreadCount}</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">
                                {CHANNEL_LABELS[session.channel] || session.channel}
                                {session.messageCount > 0 && ` · ${session.messageCount} сообщ.`}
                              </p>
                              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {session.lastMessageAt ? fmtDateTime(session.lastMessageAt) : fmt(session.createdAt)}
                              </p>
                              {session.orderId && (
                                <p className="text-xs text-blue-500">Заказ #{session.orderId}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[session.status] || 'bg-gray-100 text-gray-600'}`}>
                              {STATUS_LABELS[session.status] || session.status}
                            </span>
                            <Link href="/chat" className="text-xs text-blue-600 hover:underline whitespace-nowrap">
                              Открыть →
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
