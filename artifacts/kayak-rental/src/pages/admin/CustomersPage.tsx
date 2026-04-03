import { useState } from "react";
import { Link } from "wouter";
import { Search, ChevronLeft, ChevronRight, User } from "lucide-react";
import { useAdminListCustomers } from "@workspace/api-client-react";
import { COMMUNICATION_CHANNEL_LABELS } from "@/lib/constants";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminListCustomers({
    search: search || undefined,
    page,
  });

  const totalPages = data ? Math.ceil(data.total / data.perPage) : 1;

  const formatDate = (d: string) => {
    try { return format(parseISO(d), "d MMM yyyy", { locale: ru }); } catch { return d; }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Клиенты</h1>
        <div className="text-sm text-gray-500">{data?.total ?? 0} клиентов</div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Поиск по имени или телефону..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Загрузка...</div>
        ) : data?.data && data.data.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Клиент</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Контакт</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Связь</th>
                <th className="text-center text-xs font-semibold text-gray-500 px-4 py-3">Заказов</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Регистрация</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.data.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/customers/${c.id}`}>
                      <div className="flex items-center gap-2 cursor-pointer">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium text-sm text-blue-600 hover:text-blue-700">{c.name}</span>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{c.phone}</div>
                    {c.email && <div className="text-xs text-gray-500">{c.email}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {c.communicationChannel ? COMMUNICATION_CHANNEL_LABELS[c.communicationChannel] ?? c.communicationChannel : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-semibold text-gray-900">{c.orderCount}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <User className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <div className="text-sm">Клиентов не найдено</div>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">Страница {page} из {totalPages}</div>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
