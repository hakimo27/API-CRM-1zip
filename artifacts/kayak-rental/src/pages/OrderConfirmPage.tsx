import { Link, useParams } from "wouter";
import { CheckCircle, Package, Phone, Clock, ChevronRight } from "lucide-react";
import { useGetOrder } from "@workspace/api-client-react";
import { ORDER_STATUS_LABELS, DELIVERY_TYPE_LABELS } from "@/lib/constants";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

export default function OrderConfirmPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useGetOrder(parseInt(id ?? "0"), {
    query: { enabled: !!id },
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto" />
          <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-4xl mb-4">❌</div>
        <h1 className="text-xl font-bold">Заказ не найден</h1>
        <Link href="/">
          <button className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700">
            На главную
          </button>
        </Link>
      </div>
    );
  }

  const formatDate = (d: string) => {
    try { return format(parseISO(d), "d MMMM yyyy", { locale: ru }); } catch { return d; }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      {/* Success header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Заказ оформлен!</h1>
        <p className="text-gray-500 text-sm">
          Номер заказа: <span className="font-semibold text-gray-700">{order.orderNumber}</span>
        </p>
      </div>

      {/* Important info */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <Package className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-900 mb-1">Привозите только залог</div>
            <p className="text-amber-800 text-sm leading-relaxed">
              Из залога берётся оплата аренды, остаток возвращается при сдаче снаряжения в исправном состоянии.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <Phone className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-blue-900 mb-1">Менеджер проверит заказ и свяжется с вами</div>
            <p className="text-blue-800 text-sm leading-relaxed">
              Мы подтвердим наличие снаряжения и уточним детали получения.
            </p>
          </div>
        </div>
      </div>

      {/* Order details */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Детали заказа</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Статус</span>
            <span className="font-medium">{ORDER_STATUS_LABELS[order.status] ?? order.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Даты аренды</span>
            <span className="font-medium">{formatDate(order.startDate)} — {formatDate(order.endDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Получение</span>
            <span className="font-medium">{DELIVERY_TYPE_LABELS[order.deliveryType] ?? order.deliveryType}</span>
          </div>
          {order.deliveryAddress && (
            <div className="flex justify-between">
              <span className="text-gray-500">Адрес</span>
              <span className="font-medium text-right max-w-xs">{order.deliveryAddress}</span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Состав заказа</div>
          {order.items.map((item: any, i: number) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <span className="text-gray-700">{item.productName}</span>
              <span className="text-gray-500">×{item.quantity}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
          {order.totalDeposit && (
            <div className="flex justify-between">
              <span className="text-gray-500">Залог:</span>
              <span className="font-semibold text-amber-700">
                {order.totalDeposit.toLocaleString("ru-RU")} ₽
              </span>
            </div>
          )}
          {order.exactPrice && (
            <div className="flex justify-between">
              <span className="text-gray-500">Стоимость аренды:</span>
              <span className="font-semibold text-gray-900">
                {order.exactPrice.toLocaleString("ru-RU")} ₽
              </span>
            </div>
          )}
          {order.approximatePrice && !order.exactPrice && (
            <div className="flex justify-between">
              <span className="text-gray-500">Ориентировочная стоимость:</span>
              <span className="font-semibold text-gray-900">
                ~{order.approximatePrice.toLocaleString("ru-RU")} ₽
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/" className="flex-1">
          <button className="w-full border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm">
            На главную
          </button>
        </Link>
        <Link href="/catalog" className="flex-1">
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors text-sm flex items-center justify-center gap-1">
            Ещё снаряжение
            <ChevronRight className="w-4 h-4" />
          </button>
        </Link>
      </div>
    </div>
  );
}
