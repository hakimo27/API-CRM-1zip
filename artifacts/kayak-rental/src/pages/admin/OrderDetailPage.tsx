import { useState } from "react";
import { Link, useParams } from "wouter";
import { ChevronLeft, Loader2, CheckCircle } from "lucide-react";
import { useAdminGetOrder, useAdminUpdateOrderStatus, getAdminGetOrderQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, DELIVERY_TYPE_LABELS, COMMUNICATION_CHANNEL_LABELS } from "@/lib/constants";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

const STATUS_FLOW = ["new", "confirmed", "paid", "assembled", "issued", "delivered", "completed"];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = parseInt(id ?? "0");
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [updating, setUpdating] = useState(false);
  const [success, setSuccess] = useState(false);

  const { data: order, isLoading } = useAdminGetOrder(orderId, {
    query: { enabled: !!orderId },
  });

  const updateStatus = useAdminUpdateOrderStatus();

  const handleStatusUpdate = async () => {
    if (!selectedStatus || !orderId) return;
    setUpdating(true);
    setSuccess(false);
    try {
      await updateStatus.mutateAsync({
        id: orderId,
        data: { status: selectedStatus as any, comment: comment || undefined },
      });
      await queryClient.invalidateQueries({ queryKey: getAdminGetOrderQueryKey(orderId) });
      setComment("");
      setSelectedStatus("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (d: string) => {
    try { return format(parseISO(d), "d MMMM yyyy", { locale: ru }); } catch { return d; }
  };
  const formatDateTime = (d: string) => {
    try { return format(parseISO(d), "d MMM yyyy HH:mm", { locale: ru }); } catch { return d; }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <div className="text-gray-500 mb-4">Заказ не найден</div>
        <Link href="/admin/orders">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            К списку заказов
          </button>
        </Link>
      </div>
    );
  }

  const currentStatusIdx = STATUS_FLOW.indexOf(order.status);

  return (
    <div className="max-w-4xl">
      <Link href="/admin/orders">
        <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-5 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          К списку заказов
        </button>
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-3">
            {order.orderNumber}
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </h1>
          <div className="text-sm text-gray-500 mt-1">Создан {formatDateTime(order.createdAt)}</div>
        </div>
      </div>

      {/* Status flow */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="text-sm font-semibold text-gray-700 mb-4">Статус заказа</div>
        <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-2">
          {STATUS_FLOW.map((s, i) => {
            const isDone = i <= currentStatusIdx;
            const isCurrent = i === currentStatusIdx;
            return (
              <div key={s} className="flex items-center shrink-0">
                <div className={`flex flex-col items-center gap-1`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                    isCurrent ? "bg-blue-600 text-white" :
                    isDone ? "bg-green-500 text-white" :
                    "bg-gray-200 text-gray-400"
                  }`}>
                    {isDone && !isCurrent ? "✓" : i + 1}
                  </div>
                  <span className={`text-xs ${isCurrent ? "text-blue-600 font-medium" : isDone ? "text-green-600" : "text-gray-400"}`}>
                    {ORDER_STATUS_LABELS[s]}
                  </span>
                </div>
                {i < STATUS_FLOW.length - 1 && (
                  <div className={`h-0.5 w-8 mx-1 mt-[-14px] ${i < currentStatusIdx ? "bg-green-400" : "bg-gray-200"}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Новый статус</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Выберите статус</option>
              {STATUS_FLOW.concat(["cancelled"]).map((s) => (
                <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Комментарий</label>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Опциональный комментарий"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleStatusUpdate}
              disabled={!selectedStatus || updating}
              className={`w-full py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                success ? "bg-green-600 text-white" : "bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white"
              }`}
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> :
               success ? <><CheckCircle className="w-4 h-4" /> Сохранено</> :
               "Обновить"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Customer */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm font-semibold text-gray-700 mb-4">Клиент</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Имя</span>
              <span className="font-medium">{order.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Телефон</span>
              <span className="font-medium">{order.customerPhone}</span>
            </div>
            {order.customerEmail && (
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="font-medium">{order.customerEmail}</span>
              </div>
            )}
            {order.communicationChannel && (
              <div className="flex justify-between">
                <span className="text-gray-500">Связь</span>
                <span>{COMMUNICATION_CHANNEL_LABELS[order.communicationChannel] ?? order.communicationChannel}</span>
              </div>
            )}
          </div>
        </div>

        {/* Rental details */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm font-semibold text-gray-700 mb-4">Аренда</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Даты</span>
              <span className="font-medium">{formatDate(order.startDate)} — {formatDate(order.endDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Получение</span>
              <span>{DELIVERY_TYPE_LABELS[order.deliveryType] ?? order.deliveryType}</span>
            </div>
            {order.deliveryAddress && (
              <div className="flex justify-between">
                <span className="text-gray-500">Адрес</span>
                <span className="text-right max-w-[200px]">{order.deliveryAddress}</span>
              </div>
            )}
            {order.totalDeposit && (
              <div className="flex justify-between">
                <span className="text-gray-500">Залог</span>
                <span className="font-semibold text-amber-700">{order.totalDeposit.toLocaleString("ru-RU")} ₽</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Стоимость</span>
              <span className="font-semibold">
                {order.exactPrice
                  ? `${order.exactPrice.toLocaleString("ru-RU")} ₽`
                  : order.approximatePrice
                  ? `~${order.approximatePrice.toLocaleString("ru-RU")} ₽`
                  : "—"}
                {order.managerReviewRequired && <span className="text-xs text-orange-500 ml-1">*уточнить</span>}
              </span>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm font-semibold text-gray-700 mb-4">Состав заказа</div>
          <div className="space-y-3">
            {order.items.map((item: any, i: number) => (
              <div key={i} className="flex justify-between items-start text-sm">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{item.productName}</div>
                  {item.depositAmount && (
                    <div className="text-xs text-gray-500">
                      Залог: {(item.depositAmount * item.quantity).toLocaleString("ru-RU")} ₽
                    </div>
                  )}
                </div>
                <span className="text-gray-500 ml-4">×{item.quantity}</span>
              </div>
            ))}
          </div>
          {order.comment && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-500 mb-1">Комментарий клиента</div>
              <div className="text-sm text-gray-700">{order.comment}</div>
            </div>
          )}
        </div>

        {/* Status history */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm font-semibold text-gray-700 mb-4">История статусов</div>
          <div className="space-y-3">
            {order.statusHistory.map((h: any, i: number) => (
              <div key={i} className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium">{ORDER_STATUS_LABELS[h.status] ?? h.status}</div>
                  {h.comment && <div className="text-xs text-gray-500">{h.comment}</div>}
                  <div className="text-xs text-gray-400">{formatDateTime(h.changedAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
