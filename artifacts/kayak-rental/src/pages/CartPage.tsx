import { useState } from "react";
import { Link } from "wouter";
import { Trash2, ShoppingBag, Calendar, ChevronRight, AlertCircle } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useCalculatePrice } from "@workspace/api-client-react";
import { getTotalDeposit } from "@/lib/cart";

function PricePreview({ productId, startDate, endDate, quantity }: {
  productId: number; startDate: string; endDate: string; quantity: number;
}) {
  const { data: pricing } = useCalculatePrice(
    { productId, startDate, endDate, quantity },
    { query: { enabled: !!startDate && !!endDate && startDate < endDate } },
  );

  if (!pricing) return null;

  return (
    <div className="text-xs text-gray-500 mt-1">
      {pricing.days} дн. ×{" "}
      {pricing.pricePerDay?.toLocaleString("ru-RU")} ₽ ={" "}
      <span className="font-semibold text-gray-900">
        {((pricing.exactPrice ?? pricing.approximatePrice) ?? 0).toLocaleString("ru-RU")} ₽
        {pricing.managerReviewRequired && " *"}
      </span>
    </div>
  );
}

export default function CartPage() {
  const { cart, removeItem, setDates, updateQuantity } = useCart();
  const [startDate, setStartDate] = useState(cart.startDate ?? "");
  const [endDate, setEndDate] = useState(cart.endDate ?? "");

  const handleDateChange = (field: "start" | "end", value: string) => {
    if (field === "start") {
      setStartDate(value);
      if (endDate) setDates(value, endDate);
    } else {
      setEndDate(value);
      if (startDate) setDates(startDate, value);
    }
  };

  const totalDeposit = getTotalDeposit(cart);

  if (cart.items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-5">🛒</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Корзина пуста</h1>
        <p className="text-gray-500 mb-8">Добавьте снаряжение из каталога</p>
        <Link href="/catalog">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors">
            Перейти в каталог
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
        <ShoppingBag className="w-6 h-6 text-blue-600" />
        Корзина
        <span className="text-base font-normal text-gray-400">({cart.items.length} позиции)</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Dates */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Даты аренды
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Начало</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleDateChange("start", e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Конец</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleDateChange("end", e.target.value)}
                  min={startDate || new Date().toISOString().split("T")[0]}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {cart.items.map((item) => (
            <div key={item.productId} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-slate-100 shrink-0">
                {item.mainImage ? (
                  <img src={item.mainImage} alt={item.productName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">🛶</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/catalog/${item.productSlug}`}>
                  <div className="font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer text-sm leading-tight truncate">
                    {item.productName}
                  </div>
                </Link>
                {item.depositAmount && (
                  <div className="text-xs text-amber-600 mt-1">
                    Залог: {(item.depositAmount * item.quantity).toLocaleString("ru-RU")} ₽
                  </div>
                )}
                {startDate && endDate && (
                  <PricePreview
                    productId={item.productId}
                    startDate={startDate}
                    endDate={endDate}
                    quantity={item.quantity}
                  />
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="px-2 py-1.5 hover:bg-gray-50 text-gray-600 text-sm"
                  >
                    −
                  </button>
                  <span className="px-3 text-sm font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="px-2 py-1.5 hover:bg-gray-50 text-gray-600 text-sm"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.productId)}
                  className="text-red-400 hover:text-red-600 p-1 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-20">
            <div className="text-sm font-semibold text-gray-700 mb-4">Итого</div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Позиций:</span>
                <span className="font-medium">{cart.items.length}</span>
              </div>
              {totalDeposit > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Залог (итого):</span>
                  <span className="font-medium text-amber-700">{totalDeposit.toLocaleString("ru-RU")} ₽</span>
                </div>
              )}
            </div>

            {!startDate || !endDate ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 mb-4 flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                Укажите даты аренды для расчета стоимости
              </div>
            ) : null}

            <div className="text-xs text-gray-400 mb-4 bg-blue-50 rounded-lg p-3">
              Привозите только залог — из него берём оплату аренды. Менеджер свяжется с вами для подтверждения.
            </div>

            <Link href="/checkout">
              <button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                Оформить заказ
                <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
