import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Users, Search, Phone, Mail, ShoppingBag } from 'lucide-react';
import { useState } from 'react';

export default function CustomersPage() {
  const [search, setSearch] = useState('');

  const { data: customers = [], isLoading } = useQuery<any[]>({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers'),
  });

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return !search || c.firstName?.toLowerCase().includes(q) || c.lastName?.toLowerCase().includes(q)
      || c.email?.toLowerCase().includes(q) || c.phone?.includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени, email, телефону..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Клиенты</h2>
          <span className="text-sm text-gray-400">{filtered.length} записей</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Клиенты не найдены</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Клиент</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Контакт</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Заказы</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сумма</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Регистрация</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700 text-sm">
                          {(c.firstName || c.name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-900">
                            {c.firstName} {c.lastName}
                          </div>
                          {c.source && <div className="text-xs text-gray-400">{c.source}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1">
                          <Mail className="w-3.5 h-3.5" />
                          {c.email}
                        </div>
                      )}
                      {c.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Phone className="w-3.5 h-3.5" />
                          {c.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <ShoppingBag className="w-4 h-4 text-gray-400" />
                        {c.ordersCount || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {Number(c.totalSpent || 0).toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString('ru-RU') : '—'}
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
