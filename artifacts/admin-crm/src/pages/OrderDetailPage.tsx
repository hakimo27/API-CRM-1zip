import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Link, useLocation } from 'wouter';
import { useState } from 'react';
import {
  ChevronLeft, Phone, Mail, MapPin, Package, Loader2, Plus, Trash2,
  Edit2, Check, X, Calendar, Truck, User, Clock, MessageSquare,
  AlertCircle, CheckCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STATUS_OPTIONS = [
  { value: 'new', label: 'Новый', color: 'bg-blue-100 text-blue-700' },
  { value: 'confirmed', label: 'Подтверждён', color: 'bg-green-100 text-green-700' },
  { value: 'paid', label: 'Оплачен', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'assembled', label: 'Собран', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'issued', label: 'Выдан', color: 'bg-orange-100 text-orange-700' },
  { value: 'delivered', label: 'Доставлен', color: 'bg-teal-100 text-teal-700' },
  { value: 'in_progress', label: 'В аренде', color: 'bg-violet-100 text-violet-700' },
  { value: 'completed', label: 'Завершён', color: 'bg-gray-100 text-gray-600' },
  { value: 'cancelled', label: 'Отменён', color: 'bg-red-100 text-red-600' },
  { value: 'refunded', label: 'Возврат', color: 'bg-pink-100 text-pink-700' },
];

function fmtDate(d: any) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateTime(d: any) {
  if (!d) return '—';
  return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function toInputDate(d: any) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

interface InlineEditProps {
  value: string;
  onSave: (v: string) => void;
  type?: string;
  placeholder?: string;
}

function InlineEdit({ value, onSave, type = 'text', placeholder }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (!editing) {
    return (
      <span
        className="cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1 group"
        onClick={() => { setDraft(value); setEditing(true); }}
      >
        {value || <span className="text-gray-300 italic">{placeholder || 'Нажмите для редактирования'}</span>}
        <Edit2 className="w-3 h-3 ml-1 text-gray-300 group-hover:text-blue-500 inline" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <input
        type={type}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        className="border border-blue-300 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-full"
        autoFocus
        onKeyDown={e => {
          if (e.key === 'Enter') { onSave(draft); setEditing(false); }
          if (e.key === 'Escape') setEditing(false);
        }}
      />
      <button onClick={() => { onSave(draft); setEditing(false); }} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
      <button onClick={() => setEditing(false)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
    </span>
  );
}

export default function OrderDetailPage({ id }: { id: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [showAddItem, setShowAddItem] = useState(false);
  const [newProductId, setNewProductId] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [newPrice, setNewPrice] = useState('');
  const [showExtend, setShowExtend] = useState(false);
  const [extendDate, setExtendDate] = useState('');
  const [showDates, setShowDates] = useState(false);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editItemQty, setEditItemQty] = useState(1);
  const [editItemPrice, setEditItemPrice] = useState('');

  const numId = parseInt(id);

  const { data: order, isLoading } = useQuery<any>({
    queryKey: ['order-detail', numId],
    queryFn: () => api.get(`/orders/by-id/${numId}`),
    enabled: !isNaN(numId),
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['products-admin'],
    queryFn: () => api.get('/products?limit=200'),
    staleTime: 60_000,
  });

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ['branches-admin'],
    queryFn: () => api.get('/branches/admin'),
    staleTime: 120_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['order-detail', numId] });

  const statusMut = useMutation({
    mutationFn: ({ status, comment }: { status: string; comment?: string }) =>
      api.patch(`/orders/${numId}/status`, { status, comment }),
    onSuccess: () => { invalidate(); toast({ title: 'Статус обновлён' }); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const updateMut = useMutation({
    mutationFn: (data: any) => api.patch(`/orders/${numId}`, data),
    onSuccess: () => { invalidate(); toast({ title: 'Сохранено' }); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const addItemMut = useMutation({
    mutationFn: (data: any) => api.post(`/orders/${numId}/items`, data),
    onSuccess: () => {
      invalidate();
      setShowAddItem(false);
      setNewProductId('');
      setNewQty(1);
      setNewPrice('');
      toast({ title: 'Товар добавлен' });
    },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const updateItemMut = useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: any }) =>
      api.patch(`/orders/${numId}/items/${itemId}`, data),
    onSuccess: () => { invalidate(); setEditingItemId(null); toast({ title: 'Позиция обновлена' }); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const removeItemMut = useMutation({
    mutationFn: (itemId: number) => api.delete(`/orders/${numId}/items/${itemId}`),
    onSuccess: () => { invalidate(); toast({ title: 'Позиция удалена' }); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const extendMut = useMutation({
    mutationFn: (endDate: string) => api.patch(`/orders/${numId}/extend`, { endDate }),
    onSuccess: () => {
      invalidate();
      setShowExtend(false);
      toast({ title: 'Заказ продлён' });
    },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">😕</div>
        <p className="text-gray-500">Заказ не найден</p>
        <Link href="/orders" className="text-blue-600 hover:underline mt-2 inline-block">← К заказам</Link>
      </div>
    );
  }

  const statusInfo = STATUS_OPTIONS.find(s => s.value === order.status);
  const isActive = !['completed', 'cancelled', 'refunded'].includes(order.status);

  const handleStatusChange = (newStatus: string) => {
    statusMut.mutate({ status: newStatus, comment: statusComment || undefined });
    setStatusComment('');
  };

  const handleSaveDates = () => {
    if (!editStart || !editEnd) return;
    updateMut.mutate({ startDate: editStart, endDate: editEnd });
    setShowDates(false);
  };

  const handleAddItem = () => {
    if (!newProductId) return;
    addItemMut.mutate({
      productId: parseInt(newProductId),
      quantity: newQty,
      totalPrice: newPrice ? parseFloat(newPrice) : undefined,
    });
  };

  const startEditItem = (item: any) => {
    setEditingItemId(item.id);
    setEditItemQty(item.quantity);
    setEditItemPrice(item.totalPrice || '');
  };

  return (
    <div className="space-y-5 max-w-5xl pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/orders" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-bold text-gray-900 font-mono text-xl">{order.orderNumber}</h2>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo?.color || 'bg-gray-100 text-gray-700'}`}>
              {statusInfo?.label || order.status}
            </span>
          </div>
          <div className="text-sm text-gray-400 mt-0.5">
            Создан {fmtDateTime(order.createdAt)}
            {order.updatedAt && order.updatedAt !== order.createdAt && ` · Обновлён ${fmtDateTime(order.updatedAt)}`}
          </div>
        </div>
        {isActive && (
          <div className="flex gap-2">
            <button
              onClick={() => { setShowExtend(true); setExtendDate(toInputDate(order.endDate) || ''); }}
              className="px-3 py-2 text-sm bg-amber-50 text-amber-700 rounded-xl border border-amber-200 hover:bg-amber-100 transition-colors font-medium"
            >
              Продлить
            </button>
            <button
              onClick={() => handleStatusChange('completed')}
              disabled={statusMut.isPending}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              Завершить
            </button>
            <button
              onClick={() => handleStatusChange('cancelled')}
              disabled={statusMut.isPending}
              className="px-3 py-2 text-sm bg-red-50 text-red-600 rounded-xl border border-red-200 hover:bg-red-100 transition-colors font-medium"
            >
              Отменить
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Status change */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" /> Статус заказа
            </h3>
            <div className="flex gap-2 flex-wrap mb-3">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s.value}
                  onClick={() => handleStatusChange(s.value)}
                  disabled={statusMut.isPending || s.value === order.status}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    s.value === order.status
                      ? s.color + ' border-current ring-2 ring-offset-1 ring-current opacity-80'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={statusComment}
                onChange={e => setStatusComment(e.target.value)}
                placeholder="Комментарий к смене статуса (необязательно)"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            {statusMut.isPending && (
              <div className="flex items-center gap-2 text-sm text-blue-600 mt-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Сохраняем...
              </div>
            )}
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" /> Состав заказа
              </h3>
              {isActive && (
                <button
                  onClick={() => setShowAddItem(!showAddItem)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors font-medium"
                >
                  <Plus className="w-4 h-4" /> Добавить товар
                </button>
              )}
            </div>

            {/* Add item form */}
            {showAddItem && (
              <div className="px-5 py-4 bg-blue-50 border-b border-blue-100">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Товар</label>
                    <select
                      value={newProductId}
                      onChange={e => setNewProductId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    >
                      <option value="">Выберите товар</option>
                      {(Array.isArray(products) ? products : (products as any)?.data || []).map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Количество</label>
                    <input
                      type="number" min="1" value={newQty}
                      onChange={e => setNewQty(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Сумма (₽)</label>
                    <input
                      type="number" value={newPrice}
                      onChange={e => setNewPrice(e.target.value)}
                      placeholder="Авто"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleAddItem}
                    disabled={!newProductId || addItemMut.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {addItemMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Добавить
                  </button>
                  <button onClick={() => setShowAddItem(false)} className="px-4 py-2 text-sm text-gray-600 rounded-xl hover:bg-gray-100 transition-colors">
                    Отмена
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Товар</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">Кол-во</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Сумма</th>
                    {isActive && <th className="px-5 py-3 w-20"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {order.items?.length === 0 ? (
                    <tr>
                      <td colSpan={isActive ? 4 : 3} className="px-5 py-8 text-center text-sm text-gray-400">
                        Нет позиций в заказе
                      </td>
                    </tr>
                  ) : order.items?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 text-sm text-gray-900 font-medium">
                        {item.product?.name || item.productName || `Товар #${item.productId}`}
                        {item.startDate && item.endDate && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            {fmtDate(item.startDate)} — {fmtDate(item.endDate)}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center text-sm text-gray-700">
                        {editingItemId === item.id ? (
                          <input
                            type="number" min="1" value={editItemQty}
                            onChange={e => setEditItemQty(parseInt(e.target.value) || 1)}
                            className="w-16 text-center px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        ) : (
                          <span>{item.quantity} шт.</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-semibold text-gray-900">
                        {editingItemId === item.id ? (
                          <input
                            type="number" value={editItemPrice}
                            onChange={e => setEditItemPrice(e.target.value)}
                            placeholder="Сумма ₽"
                            className="w-24 text-right px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        ) : (
                          <span>{item.totalPrice ? `${Number(item.totalPrice).toLocaleString('ru-RU')} ₽` : '—'}</span>
                        )}
                      </td>
                      {isActive && (
                        <td className="px-5 py-3 text-right">
                          {editingItemId === item.id ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => updateItemMut.mutate({
                                  itemId: item.id,
                                  data: { quantity: editItemQty, totalPrice: editItemPrice ? parseFloat(editItemPrice) : undefined },
                                })}
                                disabled={updateItemMut.isPending}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingItemId(null)} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEditItem(item)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => removeItemMut.mutate(item.id)}
                                disabled={removeItemMut.isPending}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td colSpan={isActive ? 2 : 2} className="px-5 py-3 font-semibold text-gray-900 text-sm">Итого</td>
                    <td className="px-5 py-3 text-right font-bold text-blue-700 text-base">
                      {Number(order.totalAmount || 0).toLocaleString('ru-RU')} ₽
                    </td>
                    {isActive && <td />}
                  </tr>
                  {order.totalDeposit && (
                    <tr className="bg-gray-50">
                      <td colSpan={isActive ? 2 : 2} className="px-5 py-1.5 text-xs text-gray-500">Залог</td>
                      <td className="px-5 py-1.5 text-right text-xs font-medium text-gray-700">
                        {Number(order.totalDeposit).toLocaleString('ru-RU')} ₽
                      </td>
                      {isActive && <td />}
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </div>

          {/* History */}
          {order.statusHistory?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" /> История изменений
              </h3>
              <div className="space-y-3">
                {order.statusHistory.map((h: any, i: number) => {
                  const s = STATUS_OPTIONS.find(x => x.value === h.status);
                  return (
                    <div key={i} className="flex gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${s?.color.split(' ')[0] || 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s?.color || 'bg-gray-100 text-gray-600'}`}>
                            {s?.label || h.status}
                          </span>
                          <span className="text-xs text-gray-400">{fmtDateTime(h.changedAt)}</span>
                        </div>
                        {h.comment && (
                          <p className="text-sm text-gray-600 mt-1">{h.comment}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Customer */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" /> Клиент
            </h3>
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-900">
                <InlineEdit
                  value={order.customerName || ''}
                  placeholder="Имя клиента"
                  onSave={v => updateMut.mutate({ customerName: v })}
                />
              </div>
              {order.customerPhone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <a href={`tel:${order.customerPhone}`} className="hover:text-blue-600">{order.customerPhone}</a>
                </div>
              )}
              {order.customerEmail && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <a href={`mailto:${order.customerEmail}`} className="hover:text-blue-600 truncate">{order.customerEmail}</a>
                </div>
              )}
              {order.customer && (
                <Link href={`/customers/${order.customer.id}`} className="text-xs text-blue-600 hover:underline">
                  Открыть карточку клиента →
                </Link>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-600" /> Период аренды</span>
              {isActive && (
                <button
                  onClick={() => {
                    setEditStart(toInputDate(order.startDate));
                    setEditEnd(toInputDate(order.endDate));
                    setShowDates(true);
                  }}
                  className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-gray-400 hover:text-blue-600" />
                </button>
              )}
            </h3>
            {showDates ? (
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Начало</label>
                  <input type="date" value={editStart} onChange={e => setEditStart(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Конец</label>
                  <input type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={handleSaveDates} disabled={updateMut.isPending}
                    className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    Сохранить
                  </button>
                  <button onClick={() => setShowDates(false)} className="px-3 py-2 text-sm text-gray-500 rounded-xl hover:bg-gray-50 transition-colors">
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-400">Начало</span>
                  <span className="font-medium">{fmtDate(order.startDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Конец</span>
                  <span className="font-medium">{fmtDate(order.endDate)}</span>
                </div>
                {order.startDate && order.endDate && (
                  <div className="flex justify-between text-xs text-gray-400 border-t border-gray-100 pt-2">
                    <span>Дней</span>
                    <span>{Math.ceil((new Date(order.endDate).getTime() - new Date(order.startDate).getTime()) / 86400000)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Delivery */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" /> Доставка / Самовывоз
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex gap-2">
                <button
                  onClick={() => updateMut.mutate({ deliveryType: 'pickup' })}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    order.deliveryType === 'pickup' || !order.deliveryType
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  📍 Самовывоз
                </button>
                <button
                  onClick={() => updateMut.mutate({ deliveryType: 'delivery' })}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    order.deliveryType === 'delivery'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  🚚 Доставка
                </button>
              </div>

              {(order.deliveryType === 'pickup' || !order.deliveryType) && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Точка самовывоза</label>
                  {order.pickupBranchName ? (
                    <div className="flex items-start gap-2 text-gray-700 bg-blue-50 rounded-xl px-3 py-2">
                      <MapPin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm font-medium text-blue-800">{order.pickupBranchName}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Точка не выбрана</p>
                  )}
                  {branches.length > 0 && (
                    <select
                      className="mt-2 w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      defaultValue={order.pickupBranchId || ''}
                      onChange={e => {
                        const bid = e.target.value ? Number(e.target.value) : null;
                        const branch = branches.find((b: any) => b.id === bid);
                        updateMut.mutate({
                          pickupBranchId: bid,
                          pickupBranchName: branch
                            ? (branch.address ? `${branch.name} (${branch.address})` : branch.name)
                            : null,
                        });
                      }}
                    >
                      <option value="">— изменить точку самовывоза —</option>
                      {branches.map((b: any) => (
                        <option key={b.id} value={b.id}>{b.name}{b.address ? ` · ${b.address}` : ''}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {order.deliveryType === 'delivery' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Адрес доставки</label>
                  <div className="flex items-start gap-2 text-gray-700">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <InlineEdit
                      value={order.deliveryAddress || ''}
                      placeholder="Введите адрес"
                      onSave={v => updateMut.mutate({ deliveryAddress: v })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" /> Заметки
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Для менеджера</label>
                <InlineEdit
                  value={order.notes || ''}
                  placeholder="Добавить заметку"
                  onSave={v => updateMut.mutate({ notes: v })}
                />
              </div>
              {order.comment && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Комментарий клиента</label>
                  <p className="text-sm text-gray-700 bg-yellow-50 p-2 rounded-lg">{order.comment}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Extend Modal */}
      {showExtend && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowExtend(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-4">Продлить заказ</h3>
            <p className="text-sm text-gray-500 mb-4">Текущая дата окончания: <strong>{fmtDate(order.endDate)}</strong></p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Новая дата окончания</label>
              <input
                type="date"
                value={extendDate}
                min={toInputDate(order.endDate) || undefined}
                onChange={e => setExtendDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => extendMut.mutate(extendDate)}
                disabled={!extendDate || extendMut.isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {extendMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Продлить
              </button>
              <button onClick={() => setShowExtend(false)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
