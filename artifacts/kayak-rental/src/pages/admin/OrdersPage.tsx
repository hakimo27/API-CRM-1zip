import { useState } from "react";
import { Link } from "wouter";
import { Search, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useAdminListOrders } from "@workspace/api-client-react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, DELIVERY_TYPE_LABELS } from "@/lib/constants";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

const ORDER_STATUSES = ["new", "confirmed", "paid", "assembled", "issued", "delivered", "completed", "cancelled"];

export default function OrdersPage() {
  const [status, setStatus] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminListOrders({
    status: status as any,
    search: search || undefined,
    page,
  });

  const formatDate = (d: string) => {
    try { return format(parseISO(d), "d MMM", { locale: ru }); } catch { return d; }
  };

  const totalPages = data ? Math.ceil(data.total / data.perPage) : 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Заказы</h1>
        <div className="text-sm text-gray-500">{data?.total ?? 0} заказов</div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Поиск по имени, телефону, номеру..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setStatus(undefined); setPage(1); }}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${!status ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            Все
          </button>
          {ORDER_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${status === s ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              {ORDER_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-gray-50 mx-4 my-2 rounded" />
            ))}
          </div>
        ) : data?.data && data.data.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Номер</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Клиент</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Даты</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Доставка</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Статус</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Сумма</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.data.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${order.id}`}>
                      <div className="flex items-center gap-2 cursor-pointer">
                        <span className="font-medium text-sm text-blue-600 hover:text-blue-700">
                          {order.orderNumber}
                        </span>
                        {order.managerReviewRequired && (
                          <AlertCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" title="Требует проверки" />
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900 font-medium">{order.customerName}</div>
                    <div className="text-xs text-gray-500">{order.customerPhone}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {formatDate(order.startDate)} — {formatDate(order.endDate)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {DELIVERY_TYPE_LABELS[order.deliveryType] ?? order.deliveryType}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    {order.exactPrice
                      ? `${order.exactPrice.toLocaleString("ru-RU")} ₽`
                      : order.approximatePrice
                      ? `~${order.approximatePrice.toLocaleString("ru-RU")} ₽`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <div className="text-sm">Заказов не найдено</div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">
            Страница {page} из {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ShoppingBag(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  );
}
