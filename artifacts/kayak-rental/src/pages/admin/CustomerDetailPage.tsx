import { Link, useParams } from "wouter";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useAdminGetCustomer } from "@workspace/api-client-react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, COMMUNICATION_CHANNEL_LABELS, DELIVERY_TYPE_LABELS } from "@/lib/constants";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: customer, isLoading } = useAdminGetCustomer(parseInt(id ?? "0"), {
    query: { enabled: !!id },
  });

  const formatDate = (d: string) => {
    try { return format(parseISO(d), "d MMMM yyyy", { locale: ru }); } catch { return d; }
  };

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  if (!customer) return (
    <div className="text-center py-16">
      <div className="text-gray-500 mb-4">Клиент не найден</div>
      <Link href="/admin/customers"><button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">К списку</button></Link>
    </div>
  );

  return (
    <div className="max-w-3xl">
      <Link href="/admin/customers">
        <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-5">
          <ChevronLeft className="w-4 h-4" /> К списку клиентов
        </button>
      </Link>

      <h1 className="text-xl font-bold text-gray-900 mb-5">{customer.name}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm font-semibold text-gray-700 mb-4">Контакты</div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Телефон</span>
              <a href={`tel:${customer.phone}`} className="font-medium text-blue-600 hover:underline">{customer.phone}</a>
            </div>
            {customer.email && (
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <a href={`mailto:${customer.email}`} className="font-medium text-blue-600 hover:underline">{customer.email}</a>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Способ связи</span>
              <span>{customer.communicationChannel ? COMMUNICATION_CHANNEL_LABELS[customer.communicationChannel] ?? customer.communicationChannel : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Клиент с</span>
              <span>{formatDate(customer.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm font-semibold text-gray-700 mb-4">Статистика</div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Всего заказов</span>
              <span className="font-semibold">{customer.orders.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Завершено</span>
              <span>{customer.orders.filter((o) => o.status === "completed").length}</span>
            </div>
          </div>
          {customer.notes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-500 mb-1">Заметки</div>
              <div className="text-sm text-gray-700">{customer.notes}</div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="text-sm font-semibold text-gray-700 mb-4">История заказов</div>
        {customer.orders.length > 0 ? (
          <div className="space-y-3">
            {customer.orders.map((order) => (
              <Link key={order.id} href={`/admin/orders/${order.id}`}>
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-blue-600">{order.orderNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ORDER_STATUS_COLORS[order.status]}`}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(order.startDate)} — {formatDate(order.endDate)} · {DELIVERY_TYPE_LABELS[order.deliveryType] ?? order.deliveryType}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {order.exactPrice ? `${order.exactPrice.toLocaleString("ru-RU")} ₽` :
                     order.approximatePrice ? `~${order.approximatePrice.toLocaleString("ru-RU")} ₽` : "—"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-gray-400 text-sm text-center py-8">Заказов нет</div>
        )}
      </div>
    </div>
  );
}
