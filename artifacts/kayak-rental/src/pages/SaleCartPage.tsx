import { Link, useLocation } from 'wouter';
import { useSaleCart } from '@/contexts/SaleCartContext';
import { Trash2, Plus, Minus, Package, ShoppingBag, ArrowRight, ChevronLeft } from 'lucide-react';

const STOCK_LABEL: Record<string, string> = {
  in_stock: 'В наличии',
  low_stock: 'Заканчивается',
  out_of_stock: 'Нет в наличии',
  pre_order: 'Под заказ',
};

export default function SaleCartPage() {
  const { items, removeItem, updateQty, totalAmount, clearCart } = useSaleCart();
  const [, navigate] = useLocation();

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-20 h-20 text-gray-200 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Корзина пуста</h1>
        <p className="text-gray-500 mb-8">Добавьте товары из каталога продажи</p>
        <Link href="/sale"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Перейти в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/sale" className="p-2 -ml-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Корзина</h1>
        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-sm">{items.length} позиции</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map(item => (
            <div key={item.productId}
              className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4 items-start hover:shadow-sm transition-shadow">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50 flex-shrink-0 flex items-center justify-center">
                {item.image
                  ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  : <Package className="w-8 h-8 text-gray-300" />}
              </div>

              <div className="flex-1 min-w-0">
                <Link href={`/sale/${item.slug}`}
                  className="font-semibold text-gray-900 hover:text-blue-700 transition-colors line-clamp-2 mb-1">
                  {item.name}
                </Link>
                <div className="text-xs text-gray-400 mb-3">
                  {STOCK_LABEL[item.stockStatus] || item.stockStatus}
                </div>

                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1">
                    <button onClick={() => updateQty(item.productId, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all text-gray-600">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-semibold text-gray-900 text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.productId, item.quantity + 1)}
                      disabled={item.maxQuantity > 0 && item.quantity >= item.maxQuantity}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-gray-900">
                      {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                    </div>
                    {item.quantity > 1 && (
                      <div className="text-xs text-gray-400">{item.price.toLocaleString('ru-RU')} ₽ × {item.quantity}</div>
                    )}
                  </div>

                  <button onClick={() => removeItem(item.productId)}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all ml-auto">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button onClick={clearCart}
            className="text-xs text-gray-400 hover:text-red-500 hover:underline transition-colors py-1">
            Очистить корзину
          </button>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-24">
            <h2 className="font-semibold text-gray-900 mb-4">Итого</h2>

            <div className="space-y-2 mb-4">
              {items.map(item => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate pr-2 flex-1">{item.name}</span>
                  <span className="text-gray-900 font-medium whitespace-nowrap">
                    {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4 mb-5">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900">К оплате</span>
                <span className="text-xl font-extrabold text-gray-900">
                  {totalAmount.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            </div>

            <button onClick={() => navigate('/sale/checkout')}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
              Оформить заказ
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-xs text-gray-400 text-center mt-3">
              Доставка рассчитывается при оформлении
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
