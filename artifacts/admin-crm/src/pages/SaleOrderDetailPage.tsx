import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Link } from 'wouter';
import { useState } from 'react';
import {
  ChevronLeft, Package, Loader2, Plus, Trash2, Edit2, Check, X,
  User, Truck, MessageSquare, Clock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STATUSES = [
  { value: 'new', label: 'Новый', color: 'bg-blue-100 text-blue-700' },
  { value: 'processing', label: 'В обработке', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'shipped', label: 'Отправлен', color: 'bg-orange-100 text-orange-700' },
  { value: 'delivered', label: 'Доставлен', color: 'bg-teal-100 text-teal-700' },
  { value: 'cancelled', label: 'Отменён', color: 'bg-red-100 text-red-600' },
  { value: 'refunded', label: 'Возврат', color: 'bg-pink-100 text-pink-700' },
];

function fmtDate(d: any) {
  if (!d) return '—';
  return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SaleOrderDetailPage({ id }: { id: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const numId = parseInt(id);

  const [showAddItem, setShowAddItem] = useState(false);
  const [newProductId, setNewProductId] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [newPrice, setNewPrice] = useState('');
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editQty, setEditQty] = useState(1);
  const [editPrice, setEditPrice] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);

  const { data: order, isLoading } = useQuery<any>({
    queryKey: ['sale-order-detail', numId],
    queryFn: () => api.get(`/sales/orders/${numId}`),
    enabled: !isNaN(numId),
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['sale-products-admin'],
    queryFn: () => api.get('/sales/products/admin'),
    staleTime: 60_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['sale-order-detail', numId] });

  const statusMut = useMutation({
    mutationFn: (status: string) => api.patch(`/sales/orders/${numId}/status`, { status }),
    onSuccess: () => { invalidate(); toast({ title: 'Статус обновлён' }); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const updateMut = useMutation({
    mutationFn: (data: any) => api.patch(`/sales/orders/${numId}`, data),
    onSuccess: () => { invalidate(); toast({ title: 'Сохранено' }); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const addItemMut = useMutation({
    mutationFn: (data: any) => api.post(`/sales/orders/${numId}/items`, data),
    onSuccess: () => {
      invalidate();
      setShowAddItem(false); setNewProductId(''); setNewQty(1); setNewPrice('');
      toast({ title: 'Товар добавлен' });
    },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const updateItemMut = useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: any }) =>
      api.patch(`/sales/orders/${numId}/items/${itemId}`, data),
    onSuccess: () => { invalidate(); setEditingItemId(null); toast({ title: 'Позиция обновлена' }); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const removeItemMut = useMutation({
    mutationFn: (itemId: number) => api.delete(`/sales/orders/${numId}/items/${itemId}`),
    onSuccess: () => { invalidate(); toast({ title: 'Позиция удалена' }); },
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
        <Link href="/sale-orders" className="text-blue-600 hover:underline mt-2 inline-block">← К заказам продажи</Link>
      </div>
    );
  }

  const statusInfo = STATUSES.find(s => s.value === order.status);
  const isActive = !['cancelled', 'refunded', 'delivered'].includes(order.status);
  const delivery = order.deliveryAddress as any;

  return (
    <div className="space-y-5 max-w-5xl pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/sale-orders" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-bold text-gray-900 font-mono text-xl">{order.orderNumber}</h2>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo?.color || 'bg-gray-100 text-gray-700'}`}>
              {statusInfo?.label || order.status}
            </span>
          </div>
          <div className="text-sm text-gray-400 mt-0.5">Создан {fmtDate(order.createdAt)}</div>
        </div>
        {isActive && (
          <div className="flex gap-2">
            <button
              onClick={() => statusMut.mutate('delivered')}
              disabled={statusMut.isPending}
              className="px-3 py-2 text-sm bg-teal-50 text-teal-700 border border-teal-200 rounded-xl hover:bg-teal-100 transition-colors font-medium"
            >
              Доставлен
            </button>
            <button
              onClick={() => statusMut.mutate('cancelled')}
              disabled={statusMut.isPending}
              className="px-3 py-2 text-sm bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-colors font-medium"
            >
              Отменить
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left */}
        <div className="lg:col-span-2 space-y-5">
          {/* Status */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" /> Статус
            </h3>
            <div className="flex gap-2 flex-wrap">
              {STATUSES.map(s => (
                <button
                  key={s.value}
                  onClick={() => statusMut.mutate(s.value)}
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
                  <Plus className="w-4 h-4" /> Добавить
                </button>
              )}
            </div>

            {showAddItem && (
              <div className="px-5 py-4 bg-blue-50 border-b border-blue-100">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Товар</label>
                    <select
                      value={newProductId} onChange={e => setNewProductId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    >
                      <option value="">Выберите товар</option>
                      {(Array.isArray(products) ? products : []).map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name} — {Number(p.price).toLocaleString('ru-RU')} ₽</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Количество</label>
                    <input type="number" min="1" value={newQty} onChange={e => setNewQty(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Цена (₽)</label>
                    <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)}
                      placeholder="По каталогу"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => addItemMut.mutate({ productId: parseInt(newProductId), quantity: newQty, price: newPrice ? parseFloat(newPrice) : undefined })}
                    disabled={!newProductId || addItemMut.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {addItemMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Добавить
                  </button>
                  <button onClick={() => setShowAddItem(false)} className="px-4 py-2 text-sm text-gray-600 rounded-xl hover:bg-gray-100 transition-colors">Отмена</button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Товар</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">Кол-во</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Цена</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Итог</th>
                    {isActive && <th className="px-5 py-3 w-20"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(!order.items || order.items.length === 0) ? (
                    <tr>
                      <td colSpan={isActive ? 5 : 4} className="px-5 py-8 text-center text-sm text-gray-400">Нет позиций</td>
                    </tr>
                  ) : order.items.map((item: any) => {
                    const unitPrice = parseFloat(item.price || '0');
                    const total = unitPrice * (item.quantity || 1);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-sm text-gray-900 font-medium">
                          {item.product?.name || item.name || `Товар #${item.productId}`}
                        </td>
                        <td className="px-5 py-3 text-center text-sm text-gray-700">
                          {editingItemId === item.id ? (
                            <input type="number" min="1" value={editQty} onChange={e => setEditQty(parseInt(e.target.value) || 1)}
                              className="w-16 text-center px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
                          ) : item.quantity}
                        </td>
                        <td className="px-5 py-3 text-right text-sm text-gray-500">
                          {editingItemId === item.id ? (
                            <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)}
                              placeholder="₽"
                              className="w-24 text-right px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
                          ) : `${unitPrice.toLocaleString('ru-RU')} ₽`}
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-gray-900">
                          {total.toLocaleString('ru-RU')} ₽
                        </td>
                        {isActive && (
                          <td className="px-5 py-3 text-right">
                            {editingItemId === item.id ? (
                              <div className="flex justify-end gap-1">
                                <button
                                  onClick={() => updateItemMut.mutate({ itemId: item.id, data: { quantity: editQty, price: editPrice ? parseFloat(editPrice) : undefined } })}
                                  disabled={updateItemMut.isPending}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => setEditingItemId(null)} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-1">
                                <button
                                  onClick={() => { setEditingItemId(item.id); setEditQty(item.quantity); setEditPrice(item.price || ''); }}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => removeItemMut.mutate(item.id)}
                                  disabled={removeItemMut.isPending}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td colSpan={isActive ? 3 : 3} className="px-5 py-3 font-semibold text-gray-900 text-sm">Итого</td>
                    <td className="px-5 py-3 text-right font-bold text-blue-700 text-base">
                      {Number(order.totalAmount || 0).toLocaleString('ru-RU')} ₽
                    </td>
                    {isActive && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="space-y-5">
          {/* Customer */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" /> Клиент
            </h3>
            <div className="space-y-2 text-sm">
              {delivery && (
                <>
                  <div className="font-medium text-gray-900">{delivery.name || '—'}</div>
                  {delivery.phone && <div className="text-gray-500">{delivery.phone}</div>}
                </>
              )}
              {order.paymentStatus && (
                <div className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {order.paymentStatus === 'paid' ? 'Оплачен' : order.paymentStatus === 'pending' ? 'Ожидает оплаты' : order.paymentStatus}
                </div>
              )}
            </div>
          </div>

          {/* Delivery */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" /> Доставка
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2">
                <button
                  onClick={() => updateMut.mutate({ deliveryMethod: 'pickup' })}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    order.deliveryMethod === 'pickup' || !order.deliveryMethod
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  Самовывоз
                </button>
                <button
                  onClick={() => updateMut.mutate({ deliveryMethod: 'courier' })}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    order.deliveryMethod === 'courier'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  Курьер
                </button>
              </div>
              {delivery?.address && (
                <div className="text-sm text-gray-600 pt-1">
                  <div className="font-medium">{delivery.city}</div>
                  <div className="text-gray-500">{delivery.address}</div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-blue-600" /> Заметки</span>
              {!editingNotes && (
                <button onClick={() => { setEditNotes(order.notes || ''); setEditingNotes(true); }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <Edit2 className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </h3>
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={editNotes} onChange={e => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { updateMut.mutate({ notes: editNotes }); setEditingNotes(false); }}
                    className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    Сохранить
                  </button>
                  <button onClick={() => setEditingNotes(false)} className="px-3 py-2 text-sm text-gray-500 rounded-xl hover:bg-gray-50 transition-colors">
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">{order.notes || <span className="text-gray-300 italic">Нет заметок</span>}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
