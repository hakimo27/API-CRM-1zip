import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Search, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  paid: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-600',
  completed: 'bg-gray-100 text-gray-600',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Ожидает', confirmed: 'Подтверждено',
  paid: 'Оплачено', cancelled: 'Отменено', completed: 'Завершено',
};

const STATUSES = Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }));

export default function TourBookingsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: bookings = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['tour-bookings', statusFilter],
    queryFn: () => {
      const q = statusFilter ? `?status=${statusFilter}` : '';
      return api.get(`/tours/bookings${q}`);
    },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/tours/bookings/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tour-bookings'] });
      toast({ title: 'Статус обновлён' });
    },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const filtered = search
    ? bookings.filter(b =>
        b.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        b.customerPhone?.includes(search) ||
        b.tour?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : bookings;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по клиенту, туру..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <button onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-sm transition-colors">
            <RefreshCw className="w-4 h-4" /> Обновить
          </button>
        </div>

        <div className="flex gap-2 flex-wrap mt-3">
          <button onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!statusFilter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Все
          </button>
          {STATUSES.map(s => (
            <button key={s.value} onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === s.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Бронирования туров</h2>
          <span className="text-sm text-gray-400">{filtered.length} записей</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">🚣</div>
            <p>Бронирований туров не найдено</p>
            <p className="text-sm mt-1">Бронирования появятся когда клиенты забронируют туры на сайте</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Тур</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Дата тура</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Клиент</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Участников</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Сумма</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Создано</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((b: any) => (
                  <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-sm text-gray-900">{b.tour?.name || b.tourName || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {b.tourDate?.startDate
                        ? new Date(b.tourDate.startDate).toLocaleDateString('ru-RU')
                        : b.startDate
                        ? new Date(b.startDate).toLocaleDateString('ru-RU')
                        : '—'}
                    </td>
                    <td className="px-6 py-4 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate max-w-[150px]">{b.customerName || '—'}</div>
                      <div className="text-xs text-gray-400">{b.customerPhone || ''}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium text-center">
                      {b.participants || b.quantity || 1}
                    </td>
                    <td className="px-6 py-4 font-semibold text-sm text-gray-900 whitespace-nowrap">
                      {b.totalAmount ? `${Number(b.totalAmount).toLocaleString('ru-RU')} ₽` : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={b.status}
                        onChange={e => statusMut.mutate({ id: b.id, status: e.target.value })}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 ${STATUS_BADGE[b.status] || 'bg-gray-100 text-gray-700'}`}
                      >
                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleDateString('ru-RU')}
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
