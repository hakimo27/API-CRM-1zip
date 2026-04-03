import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Package, RefreshCw, Plus, Loader2, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const CONDITION_LABELS: Record<string, string> = {
  excellent: 'Отличное', good: 'Хорошее', fair: 'Удовлетворительное', poor: 'Плохое',
};
const CONDITION_COLOR: Record<string, string> = {
  excellent: 'text-green-600', good: 'text-blue-600', fair: 'text-yellow-600', poor: 'text-red-600',
};
const STATUS_LABELS: Record<string, string> = {
  available: 'Доступен', rented: 'В аренде', maintenance: 'Обслуживание', written_off: 'Списан',
};
const STATUS_BADGE: Record<string, string> = {
  available: 'bg-green-100 text-green-700', rented: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-yellow-100 text-yellow-700', written_off: 'bg-red-100 text-red-600',
};

export default function InventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: inventory = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['inventory'],
    queryFn: () => api.get('/inventory'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/inventory/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });

  const filtered = inventory.filter(item => {
    const matchStatus = !statusFilter || item.status === statusFilter;
    const matchSearch = !search || item.name?.toLowerCase().includes(search.toLowerCase())
      || item.serialNumber?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const stats = {
    total: inventory.length,
    available: inventory.filter(i => i.status === 'available').length,
    rented: inventory.filter(i => i.status === 'rented').length,
    maintenance: inventory.filter(i => i.status === 'maintenance').length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Всего единиц', value: stats.total, color: 'bg-gray-100 text-gray-700' },
          { label: 'Доступно', value: stats.available, color: 'bg-green-100 text-green-700' },
          { label: 'В аренде', value: stats.rented, color: 'bg-blue-100 text-blue-700' },
          { label: 'Обслуживание', value: stats.maintenance, color: 'bg-yellow-100 text-yellow-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-4 text-center ${s.color}`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex gap-3">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по названию, серийному номеру..."
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
            <option value="">Все статусы</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button onClick={() => refetch()} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Инвентарь</h2>
          <span className="text-sm text-gray-400">{filtered.length} ед.</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Инвентарь пуст или не соответствует фильтрам</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Серийный №</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Состояние</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name || item.productName}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-500">{item.serialNumber || '—'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={CONDITION_COLOR[item.condition] || 'text-gray-500'}>
                        {CONDITION_LABELS[item.condition] || item.condition || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[item.status] || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={item.status}
                        onChange={e => updateStatus.mutate({ id: item.id, status: e.target.value })}
                        className="text-xs px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
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
