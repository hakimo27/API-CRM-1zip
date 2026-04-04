import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Link } from 'wouter';
import { Search, RefreshCw, ChevronRight, CalendarPlus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STATUSES = [
  { value: '', label: 'Все' },
  { value: 'new', label: 'Новые' },
  { value: 'confirmed', label: 'Подтверждённые' },
  { value: 'paid', label: 'Оплаченные' },
  { value: 'assembled', label: 'Собранные' },
  { value: 'issued', label: 'Выданные' },
  { value: 'returned', label: 'Возвращённые' },
  { value: 'completed', label: 'Завершённые' },
  { value: 'cancelled', label: 'Отменённые' },
];

const STATUS_BADGE: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  paid: 'bg-emerald-100 text-emerald-700',
  assembled: 'bg-yellow-100 text-yellow-700',
  issued: 'bg-orange-100 text-orange-700',
  returned: 'bg-gray-100 text-gray-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
};

const STATUS_LABEL: Record<string, string> = {
  new: 'Новый', confirmed: 'Подтверждён', paid: 'Оплачен',
  assembled: 'Собран', issued: 'Выдан', returned: 'Возвращён',
  completed: 'Завершён', cancelled: 'Отменён',
};

const CAN_EXTEND = ['new', 'confirmed', 'paid', 'assembled', 'issued'];

function fmt(d: string | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('ru-RU');
}

function toInputDate(d: string | null | undefined) {
  if (!d) return '';
  return new Date(d).toISOString().split('T')[0];
}

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [extendOrder, setExtendOrder] = useState<any>(null);
  const [extendDate, setExtendDate] = useState('');
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: orders = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['orders', statusFilter],
    queryFn: () => {
      const q = statusFilter ? `?status=${statusFilter}` : '';
      return api.get(`/orders${q}`);
    },
  });

  const extendMut = useMutation({
    mutationFn: ({ id, endDate }: { id: number; endDate: string }) =>
      api.patch(`/orders/${id}/extend`, { endDate }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: 'Заказ продлён', description: `Новая дата окончания: ${new Date(extendDate).toLocaleDateString('ru-RU')}` });
      setExtendOrder(null);
      setExtendDate('');
    },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const filtered = search
    ? orders.filter(o =>
        o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        o.customerPhone?.includes(search)
      )
    : orders;

  const openExtend = (order: any) => {
    setExtendOrder(order);
    setExtendDate(toInputDate(order.endDate) || '');
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по номеру, имени, телефону..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <button onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-sm transition-colors">
            <RefreshCw className="w-4 h-4" />
            Обновить
          </button>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 flex-wrap mt-3">
          {STATUSES.map(s => (
            <button key={s.value} onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === s.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Заказы</h2>
          <span className="text-sm text-gray-400">{filtered.length} записей</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📋</div>
            <p>Заказов не найдено</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Номер</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Клиент</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Период</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Сумма</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((order: any) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-sm text-gray-900 whitespace-nowrap">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate max-w-[160px]">
                        {order.customerName || '—'}
                      </div>
                      <div className="text-xs text-gray-400">{order.customerPhone || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[order.status] || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABEL[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                      {fmt(order.startDate) ? (
                        <span>{fmt(order.startDate)} — {fmt(order.endDate) || '?'}</span>
                      ) : (
                        <span className="text-gray-300">без дат</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-sm text-gray-900 whitespace-nowrap">
                      {Number(order.totalAmount || 0).toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {order.endDate && CAN_EXTEND.includes(order.status) && (
                          <button onClick={() => openExtend(order)}
                            className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-2 py-1 rounded-lg transition-colors">
                            <CalendarPlus className="w-3.5 h-3.5" /> Продлить
                          </button>
                        )}
                        <Link href={`/orders/${order.id}`}
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                          Открыть <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Extend Order Modal */}
      {extendOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setExtendOrder(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Продлить заказ</h2>
                <p className="text-xs text-gray-400 mt-0.5">{extendOrder.orderNumber}</p>
              </div>
              <button onClick={() => setExtendOrder(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                <span className="text-gray-400">Текущая дата окончания: </span>
                <span className="font-medium">{fmt(extendOrder.endDate)}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Новая дата окончания *
                </label>
                <input
                  type="date"
                  value={extendDate}
                  min={toInputDate(extendOrder.endDate)}
                  onChange={e => setExtendDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <p className="text-xs text-gray-400">
                Система проверит доступность всех товаров на продлённый период. Стоимость будет пересчитана автоматически.
              </p>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setExtendOrder(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Отмена
              </button>
              <button
                onClick={() => extendDate && extendMut.mutate({ id: extendOrder.id, endDate: extendDate })}
                disabled={!extendDate || extendMut.isPending}
                className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors">
                {extendMut.isPending ? 'Продление...' : 'Продлить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
