import { Link, useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Phone, Clock, Package, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  new: { label: 'Новый', color: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Подтверждён', color: 'bg-green-100 text-green-700' },
  paid: { label: 'Оплачен', color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Отменён', color: 'bg-red-100 text-red-700' },
  completed: { label: 'Завершён', color: 'bg-gray-100 text-gray-700' },
};

export default function OrderConfirmPage() {
  const { number } = useParams<{ number: string }>();

  const { data: order, isLoading, error } = useQuery<any>({
    queryKey: ['order', number],
    queryFn: () => api.get(`/orders/${number}`),
    enabled: !!number,
  });

  if (isLoading) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-500">Загружаем заказ...</p>
    </div>
  );

  if (error || !order) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="text-6xl mb-4">😕</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Заказ не найден</h2>
      <Link href="/" className="text-blue-600 hover:underline">На главную</Link>
    </div>
  );

  const status = STATUS_MAP[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-700' };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Заказ оформлен!</h1>
        <p className="text-gray-600">Мы свяжемся с вами в ближайшее время для подтверждения</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Номер заказа</div>
            <div className="font-mono font-bold text-lg text-gray-900">{order.orderNumber}</div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>

        {order.customerName && (
          <div className="text-sm text-gray-600 mb-1">Клиент: <span className="font-medium text-gray-900">{order.customerName}</span></div>
        )}
        {order.customerPhone && (
          <div className="text-sm text-gray-600 mb-1">Телефон: <span className="font-medium text-gray-900">{order.customerPhone}</span></div>
        )}
      </div>

      {order.items?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Состав заказа
          </h3>
          <div className="space-y-3">
            {order.items.map((item: any, i: number) => (
              <div key={i} className="flex justify-between text-sm">
                <div>
                  <div className="font-medium text-gray-900">{item.productName}</div>
                  <div className="text-gray-500">{item.quantity} шт.</div>
                </div>
                <div className="font-medium">{Number(item.totalPrice).toLocaleString('ru-RU')} ₽</div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between font-bold">
            <span>Итого</span>
            <span className="text-blue-700">{Number(order.totalAmount).toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>
      )}

      <div className="bg-blue-50 rounded-2xl p-5 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Что дальше?</h3>
        <div className="space-y-2">
          {[
            { icon: Phone, text: 'Наш менеджер позвонит вам для подтверждения заказа' },
            { icon: Clock, text: 'Обычно подтверждение происходит в течение 1-2 часов в рабочее время' },
            { icon: Package, text: 'В день аренды приезжайте в указанное место или дождитесь доставки' },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-start gap-3 text-sm text-gray-700">
              <Icon className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <Link href="/" className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
          На главную
        </Link>
        <Link href="/catalog" className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
          Ещё снаряжение
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
