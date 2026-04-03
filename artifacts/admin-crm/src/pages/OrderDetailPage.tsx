import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Link } from 'wouter';
import { ChevronLeft, Phone, Mail, MapPin, Package, Loader2 } from 'lucide-react';
import { useState } from 'react';

const STATUS_OPTIONS = [
  { value: 'new', label: 'Новый' },
  { value: 'confirmed', label: 'Подтверждён' },
  { value: 'paid', label: 'Оплачен' },
  { value: 'assembled', label: 'Собран' },
  { value: 'issued', label: 'Выдан' },
  { value: 'returned', label: 'Возвращён' },
  { value: 'completed', label: 'Завершён' },
  { value: 'cancelled', label: 'Отменён' },
];

const STATUS_BADGE: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700', confirmed: 'bg-green-100 text-green-700',
  paid: 'bg-emerald-100 text-emerald-700', assembled: 'bg-yellow-100 text-yellow-700',
  issued: 'bg-orange-100 text-orange-700', returned: 'bg-gray-100 text-gray-600',
  completed: 'bg-gray-100 text-gray-600', cancelled: 'bg-red-100 text-red-600',
};

export default function OrderDetailPage({ id }: { id: string }) {
  const qc = useQueryClient();
  const [statusValue, setStatusValue] = useState('');

  const { data: order, isLoading } = useQuery<any>({
    queryKey: ['order-detail', id],
    queryFn: () => api.get(`/orders/${id}`),
    onSuccess: (data) => { if (!statusValue) setStatusValue(data.status); },
    enabled: !!id,
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order-detail', id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!order) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">😕</div>
      <p className="text-gray-500">Заказ не найден</p>
      <Link href="/orders" className="text-blue-600 hover:underline mt-2 inline-block">← К заказам</Link>
    </div>
  );

  const status = STATUS_OPTIONS.find(s => s.value === order.status);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/orders" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h2 className="font-bold text-gray-900 font-mono text-lg">{order.orderNumber}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[order.status] || 'bg-gray-100 text-gray-700'}`}>
              {status?.label || order.status}
            </span>
            <span className="text-sm text-gray-400">{new Date(order.createdAt).toLocaleString('ru-RU')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Клиент</h3>
          <div className="space-y-3">
            {order.customerName && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700 text-sm flex-shrink-0">
                  {order.customerName[0]}
                </div>
                {order.customerName}
              </div>
            )}
            {order.customerPhone && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Phone className="w-4 h-4 text-gray-400" />
                <a href={`tel:${order.customerPhone}`} className="hover:text-blue-600">{order.customerPhone}</a>
              </div>
            )}
            {order.customerEmail && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Mail className="w-4 h-4 text-gray-400" />
                <a href={`mailto:${order.customerEmail}`} className="hover:text-blue-600">{order.customerEmail}</a>
              </div>
            )}
            {order.deliveryAddress && (
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                {order.deliveryAddress}
              </div>
            )}
          </div>
        </div>

        {/* Status Management */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Изменить статус</h3>
          <select
            value={statusValue || order.status}
            onChange={e => setStatusValue(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-3"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={() => updateStatus.mutate(statusValue || order.status)}
            disabled={updateStatus.isPending || (statusValue || order.status) === order.status}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {updateStatus.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Сохранить
          </button>
          {updateStatus.isSuccess && (
            <p className="text-xs text-green-600 mt-2 text-center">Статус обновлён</p>
          )}
          {order.deliveryType && (
            <div className="mt-3 text-xs text-gray-500">
              Доставка: {order.deliveryType === 'pickup' ? 'Самовывоз' : 'Доставка'}
            </div>
          )}
          {order.notes && (
            <div className="mt-3 p-3 bg-yellow-50 rounded-xl text-xs text-gray-700">
              <span className="font-medium">Примечание:</span> {order.notes}
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      {order.items?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Состав заказа</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Товар</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Кол-во</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Период</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Сумма</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {order.items.map((item: any, i: number) => (
                <tr key={i}>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.productName}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.quantity} шт.</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.startDate && item.endDate ? `${item.startDate} — ${item.endDate}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                    {Number(item.totalPrice || 0).toLocaleString('ru-RU')} ₽
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={3} className="px-6 py-4 font-semibold text-gray-900">Итого</td>
                <td className="px-6 py-4 font-bold text-blue-700 text-right text-lg">
                  {Number(order.totalAmount || 0).toLocaleString('ru-RU')} ₽
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
