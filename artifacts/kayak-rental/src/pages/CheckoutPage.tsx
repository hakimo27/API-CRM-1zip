import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Shield, ChevronLeft, Loader2 } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useCreateOrder } from "@workspace/api-client-react";
import { clearCart, getTotalDeposit } from "@/lib/cart";

export default function CheckoutPage() {
  const { cart, clear } = useCart();
  const [, navigate] = useLocation();
  const createOrder = useCreateOrder();

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    communicationChannel: "phone",
    deliveryType: "pickup",
    deliveryAddress: "",
    comment: "",
    privacyAccepted: false,
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cart.startDate || !cart.endDate) {
      setError("Вернитесь в корзину и выберите даты аренды");
      return;
    }

    if (cart.items.length === 0) {
      setError("Корзина пуста");
      return;
    }

    if (!form.privacyAccepted) {
      setError("Необходимо согласие на обработку персональных данных");
      return;
    }

    try {
      const data = await createOrder.mutateAsync({
        items: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        startDate: cart.startDate,
        endDate: cart.endDate,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerEmail: form.customerEmail || undefined,
        communicationChannel: form.communicationChannel as any,
        deliveryType: form.deliveryType as any,
        deliveryAddress: form.deliveryType === "delivery" ? form.deliveryAddress : undefined,
        comment: form.comment || undefined,
        privacyAccepted: true,
      });

      clear();
      navigate(`/order/${data.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err?.message ?? "Ошибка при создании заказа");
    }
  };

  const totalDeposit = getTotalDeposit(cart);

  if (cart.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🛒</div>
        <h1 className="text-xl font-bold text-gray-900 mb-4">Корзина пуста</h1>
        <Link href="/catalog">
          <button className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700">
            В каталог
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/cart">
        <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-6">
          <ChevronLeft className="w-4 h-4" />
          Назад в корзину
        </button>
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">Оформление заказа</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="md:col-span-2 space-y-5">
          {/* Contact info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm font-semibold text-gray-700 mb-4">Контактные данные</div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Имя *</label>
                <input
                  type="text"
                  required
                  value={form.customerName}
                  onChange={(e) => handleChange("customerName", e.target.value)}
                  placeholder="Иван Иванов"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Телефон *</label>
                <input
                  type="tel"
                  required
                  value={form.customerPhone}
                  onChange={(e) => handleChange("customerPhone", e.target.value)}
                  placeholder="+7 (999) 000-00-00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email</label>
                <input
                  type="email"
                  value={form.customerEmail}
                  onChange={(e) => handleChange("customerEmail", e.target.value)}
                  placeholder="ivan@example.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Предпочтительный способ связи</label>
                <select
                  value={form.communicationChannel}
                  onChange={(e) => handleChange("communicationChannel", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="phone">Телефон</option>
                  <option value="telegram">Telegram</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>
              </div>
            </div>
          </div>

          {/* Delivery */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm font-semibold text-gray-700 mb-4">Способ получения</div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[
                { value: "pickup", label: "Самовывоз", desc: "Забрать со склада" },
                { value: "delivery", label: "Доставка", desc: "Доставим по адресу" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleChange("deliveryType", opt.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    form.deliveryType === opt.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-semibold text-sm text-gray-900">{opt.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
            {form.deliveryType === "delivery" && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Адрес доставки *</label>
                <input
                  type="text"
                  required={form.deliveryType === "delivery"}
                  value={form.deliveryAddress}
                  onChange={(e) => handleChange("deliveryAddress", e.target.value)}
                  placeholder="Улица, дом, квартира"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Comment */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm font-semibold text-gray-700 mb-3">Комментарий</div>
            <textarea
              value={form.comment}
              onChange={(e) => handleChange("comment", e.target.value)}
              placeholder="Дополнительные пожелания, маршрут, опыт сплава..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Privacy */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.privacyAccepted}
              onChange={(e) => handleChange("privacyAccepted", e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600 leading-relaxed">
              Я согласен на обработку персональных данных и принимаю{" "}
              <Link href="/pages/rental-terms">
                <span className="text-blue-600 hover:underline">правила аренды</span>
              </Link>
            </span>
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={createOrder.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3.5 rounded-xl font-semibold text-base transition-colors flex items-center justify-center gap-2"
          >
            {createOrder.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Оформление...
              </>
            ) : (
              "Отправить заказ"
            )}
          </button>
        </form>

        {/* Order summary */}
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm font-semibold text-gray-700 mb-4">Ваш заказ</div>
            {cart.startDate && cart.endDate && (
              <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 mb-3">
                {cart.startDate} — {cart.endDate}
              </div>
            )}
            <div className="space-y-3">
              {cart.items.map((item) => (
                <div key={item.productId} className="flex gap-2 text-sm">
                  <div className="flex-1 text-gray-700 line-clamp-2 leading-tight">{item.productName}</div>
                  <div className="text-gray-500 shrink-0">×{item.quantity}</div>
                </div>
              ))}
            </div>
            {totalDeposit > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Залог:</span>
                  <span className="font-semibold text-amber-700">{totalDeposit.toLocaleString("ru-RU")} ₽</span>
                </div>
              </div>
            )}
            <div className="mt-3 bg-blue-50 rounded-lg p-3 text-xs text-blue-700 flex gap-2">
              <Shield className="w-4 h-4 shrink-0 mt-0.5" />
              Привозите только залог — из него берём оплату. Остаток возвращаем.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
