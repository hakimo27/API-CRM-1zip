import { Link, useLocation } from 'wouter';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { differenceInCalendarDays } from 'date-fns';

export default function CartPage() {
  const { items, removeItem, totalAmount, clearCart } = useCart();
  const [, navigate] = useLocation();

  if (items.length === 0) return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <ShoppingBag className="w-20 h-20 text-gray-300 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Корзина пуста</h2>
      <p className="text-gray-500 mb-6">Добавьте снаряжение из каталога</p>
      <Link href="/catalog" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
        Перейти в каталог
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Корзина</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => {
            const days = item.days || Math.max(1, differenceInCalendarDays(new Date(item.endDate), new Date(item.startDate)));
            return (
              <div key={item.productId} className="bg-white rounded-2xl border border-gray-100 p-5 flex gap-4">
                <div className="w-20 h-20 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl">🛶</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1 truncate">{item.name}</h3>
                  <div className="text-sm text-gray-500 mb-2">
                    Тариф: {item.tariffLabel} · {item.pricePerDay.toLocaleString('ru-RU')} ₽/день
                  </div>
                  <div className="text-sm text-gray-500">
                    {item.startDate} — {item.endDate} ({days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'})
                  </div>
                  <div className="text-sm text-gray-500">Кол-во: {item.quantity} шт.</div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <button onClick={() => removeItem(item.productId)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="font-bold text-gray-900">{item.totalPrice.toLocaleString('ru-RU')} ₽</div>
                </div>
              </div>
            );
          })}
          <button onClick={clearCart} className="text-sm text-red-500 hover:underline">Очистить корзину</button>
        </div>

        {/* Summary */}
        <div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-24">
            <h3 className="font-semibold text-gray-900 mb-4">Итого</h3>
            <div className="space-y-2 mb-4">
              {items.map(item => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate mr-2">{item.name}</span>
                  <span className="font-medium flex-shrink-0">{item.totalPrice.toLocaleString('ru-RU')} ₽</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-4 mb-6">
              <div className="flex justify-between font-bold text-lg">
                <span>Итого</span>
                <span className="text-blue-700">{totalAmount.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/checkout')}
              className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              Оформить заказ
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
