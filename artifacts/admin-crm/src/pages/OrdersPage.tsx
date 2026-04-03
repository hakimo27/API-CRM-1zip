import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Link } from 'wouter';
import { Search, Filter, RefreshCw, ChevronRight } from 'lucide-react';

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

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data: orders = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['orders', statusFilter],
    queryFn: () => {
      const q = statusFilter ? `?status=${statusFilter}` : '';
      return api.get(`/orders${q}`);
    },
  });

  const filtered = search
    ? orders.filter(o =>
        o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        o.customerPhone?.includes(search)
      )
    : orders;

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
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Сумма</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
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
                    <td className="px-6 py-4 font-semibold text-sm text-gray-900 whitespace-nowrap">
                      {Number(order.totalAmount || 0).toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/orders/${order.id}`}
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                        Открыть <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
