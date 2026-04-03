import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Shield, ChevronLeft, Loader2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

interface OrderForm {
  firstName: string; lastName: string; phone: string; email: string; comment: string;
  deliveryType: 'pickup' | 'delivery'; deliveryAddress: string;
}

export default function CheckoutPage() {
  const { items, totalAmount, clearCart } = useCart();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<OrderForm>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: '', email: user?.email || '',
    comment: '', deliveryType: 'pickup', deliveryAddress: '',
  });

  const setField = (field: keyof OrderForm, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setLoading(true);
    setError('');

    try {
      const orderData = {
        customerName: `${form.firstName} ${form.lastName}`.trim(),
        customerPhone: form.phone,
        customerEmail: form.email,
        deliveryType: form.deliveryType,
        deliveryAddress: form.deliveryAddress || undefined,
        notes: form.comment || undefined,
        items: items.map(item => ({
          productId: item.productId,
          tariffId: item.tariffId,
          quantity: item.quantity,
          startDate: item.startDate,
          endDate: item.endDate,
          pricePerDay: item.pricePerDay,
          totalPrice: item.totalPrice,
        })),
        totalAmount,
      };

      const result = await api.post<{ orderNumber: string; id: number }>('/orders', orderData);
      clearCart();
      navigate(`/order/${result.orderNumber}`);
    } catch (err: any) {
      setError(err.message || 'Ошибка при оформлении заказа');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Корзина пуста</h2>
        <Link href="/catalog" className="text-blue-600 hover:underline">Перейти в каталог</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/cart" className="inline-flex items-center gap-1 text-gray-500 hover:text-blue-600 mb-6 text-sm transition-colors">
        <ChevronLeft className="w-4 h-4" />
        Корзина
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">Оформление заказа</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Контактные данные</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Имя *</label>
                  <input required value={form.firstName} onChange={e => setField('firstName', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Иван" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Фамилия</label>
                  <input value={form.lastName} onChange={e => setField('lastName', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Иванов" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Телефон *</label>
                  <input required type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="+7 (999) 000-00-00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={e => setField('email', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="email@example.ru" />
                </div>
              </div>
            </div>

            {/* Delivery */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Способ получения</h2>
              <div className="space-y-3 mb-4">
                {[
                  { value: 'pickup', label: 'Самовывоз', desc: 'Москва, ул. Речная, 15' },
                  { value: 'delivery', label: 'Доставка', desc: 'Доставим к месту старта маршрута' },
                ].map(opt => (
                  <label key={opt.value} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                    form.deliveryType === opt.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                  }`}>
                    <input type="radio" name="delivery" value={opt.value} checked={form.deliveryType === opt.value}
                      onChange={e => setField('deliveryType', e.target.value)} className="mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">{opt.label}</div>
                      <div className="text-sm text-gray-500">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
              {form.deliveryType === 'delivery' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Адрес доставки *</label>
                  <input required={form.deliveryType === 'delivery'} value={form.deliveryAddress}
                    onChange={e => setField('deliveryAddress', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Введите адрес..." />
                </div>
              )}
            </div>

            {/* Comment */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Комментарий к заказу</h2>
              <textarea
                value={form.comment} onChange={e => setField('comment', e.target.value)} rows={3}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                placeholder="Дополнительная информация..." />
            </div>
          </div>

          {/* Summary */}
          <div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-4">Ваш заказ</h3>
              <div className="space-y-3 mb-4">
                {items.map(item => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <div>
                      <div className="text-gray-900 font-medium">{item.name}</div>
                      <div className="text-gray-500">{item.days} дн. × {item.quantity} шт.</div>
                    </div>
                    <span className="font-medium">{item.totalPrice.toLocaleString('ru-RU')} ₽</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-4 mb-6">
                <div className="flex justify-between font-bold text-lg">
                  <span>Итого</span>
                  <span className="text-blue-700">{totalAmount.toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {loading ? 'Оформляем...' : 'Оформить заказ'}
              </button>

              <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                <Shield className="w-4 h-4" />
                Ваши данные защищены
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
