import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Shield, ChevronLeft, Loader2, MapPin, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { PhoneInput } from '@/components/PhoneInput';

const API = '/api';

interface Branch {
  id: number;
  name: string;
  address: string;
  city: string;
  phones: string[];
  workingHours: Record<string, string>;
}

interface OrderForm {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  comment: string;
  deliveryType: 'pickup' | 'delivery';
  deliveryAddress: string;
  pickupBranchId: number | null;
}

function usePublicSettings() {
  return useQuery<Record<string, unknown>>({
    queryKey: ['public-settings'],
    queryFn: () => fetch(`${API}/settings/public`).then(r => r.json()),
    staleTime: 60 * 1000,
  });
}

function boolSetting(settings: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const v = settings[key];
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === 1) return true;
  if (v === 'false' || v === 0) return false;
  return fallback;
}

export default function CheckoutPage() {
  const { items, totalAmount, clearCart } = useCart();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: settings = {} } = usePublicSettings();
  const deliveryEnabled   = boolSetting(settings, 'delivery.enabled', true);
  const pickupEnabled     = boolSetting(settings, 'delivery.self_pickup_enabled', true);

  const { data: pickupPoints = [] } = useQuery<Branch[]>({
    queryKey: ['branches-pickup'],
    queryFn: () => api.get('/branches/pickup-points'),
  });

  const defaultDeliveryType: 'pickup' | 'delivery' = pickupEnabled ? 'pickup' : 'delivery';

  const [form, setForm] = useState<OrderForm>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: '',
    email: user?.email || '',
    comment: '',
    deliveryType: defaultDeliveryType,
    deliveryAddress: '',
    pickupBranchId: null,
  });

  const setField = <K extends keyof OrderForm>(field: K, value: OrderForm[K]) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const neitherEnabled = !deliveryEnabled && !pickupEnabled;

  const selectedBranch = pickupPoints.find(b => b.id === form.pickupBranchId) || pickupPoints[0] || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    if (neitherEnabled) return;

    if (!deliveryEnabled && form.deliveryType === 'delivery') {
      setError('Доставка недоступна. Выберите самовывоз.');
      return;
    }
    if (!pickupEnabled && form.deliveryType === 'pickup') {
      setError('Самовывоз недоступен. Выберите доставку.');
      return;
    }

    if (form.deliveryType === 'delivery' && !form.deliveryAddress.trim()) {
      setError('Укажите адрес доставки');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const orderData = {
        customerName: `${form.firstName} ${form.lastName}`.trim(),
        customerPhone: form.phone,
        customerEmail: form.email || undefined,
        deliveryType: form.deliveryType,
        deliveryAddress: form.deliveryType === 'delivery' ? form.deliveryAddress : undefined,
        branchId: form.deliveryType === 'pickup' ? (form.pickupBranchId || selectedBranch?.id) : undefined,
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
      setError(err.message || 'Ошибка при оформлении заказа. Попробуйте ещё раз или позвоните нам.');
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

      {neitherEnabled && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium">Способы получения временно недоступны</div>
            <div className="text-sm mt-0.5">Пожалуйста, свяжитесь с нами по телефону для оформления заказа.</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                  <PhoneInput
                    required
                    value={form.phone}
                    onChange={v => setField('phone', v)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={e => setField('email', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="email@example.ru" />
                </div>
              </div>
            </div>

            {/* Delivery — only rendered if at least one option is available */}
            {!neitherEnabled && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Способ получения</h2>
                <div className="space-y-3 mb-4">
                  {pickupEnabled && (
                    <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      form.deliveryType === 'pickup' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                    }`}>
                      <input type="radio" name="delivery" value="pickup" checked={form.deliveryType === 'pickup'}
                        onChange={() => setField('deliveryType', 'pickup')} className="mt-0.5" />
                      <div>
                        <div className="font-medium text-gray-900">Самовывоз</div>
                        <div className="text-sm text-gray-500">
                          {pickupPoints.length > 0
                            ? `${pickupPoints.length} ${pickupPoints.length === 1 ? 'точка' : 'точки'} выдачи`
                            : 'Заберите снаряжение самостоятельно'}
                        </div>
                      </div>
                    </label>
                  )}

                  {deliveryEnabled && (
                    <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      form.deliveryType === 'delivery' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                    }`}>
                      <input type="radio" name="delivery" value="delivery" checked={form.deliveryType === 'delivery'}
                        onChange={() => setField('deliveryType', 'delivery')} className="mt-0.5" />
                      <div>
                        <div className="font-medium text-gray-900">Доставка</div>
                        <div className="text-sm text-gray-500">Доставим к месту старта маршрута</div>
                      </div>
                    </label>
                  )}
                </div>

                {form.deliveryType === 'pickup' && pickupPoints.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700 mb-2">Выберите точку выдачи:</p>
                    {pickupPoints.map(branch => (
                      <label key={branch.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        (form.pickupBranchId ?? pickupPoints[0]?.id) === branch.id
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-100 hover:border-blue-200'
                      }`}>
                        <input
                          type="radio"
                          name="pickupBranch"
                          checked={(form.pickupBranchId ?? pickupPoints[0]?.id) === branch.id}
                          onChange={() => setField('pickupBranchId', branch.id)}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-blue-600" />
                            <span className="font-medium text-gray-900 text-sm">{branch.name}</span>
                          </div>
                          {branch.address && (
                            <div className="text-xs text-gray-500 mt-0.5">{branch.address}{branch.city ? `, ${branch.city}` : ''}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {form.deliveryType === 'delivery' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Адрес доставки *</label>
                    <input
                      required={form.deliveryType === 'delivery'}
                      value={form.deliveryAddress}
                      onChange={e => setField('deliveryAddress', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Введите адрес или место старта маршрута" />
                  </div>
                )}
              </div>
            )}

            {/* Comment */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Комментарий к заказу</h2>
              <textarea
                value={form.comment} onChange={e => setField('comment', e.target.value)} rows={3}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                placeholder="Дополнительная информация, пожелания..." />
            </div>
          </div>

          {/* Summary */}
          <div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-4">Ваш заказ</h3>
              <div className="space-y-3 mb-4">
                {items.map((item, idx) => (
                  <div key={`${item.productId}-${idx}`} className="flex justify-between text-sm">
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
                type="submit"
                disabled={loading || neitherEnabled}
                className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {loading ? 'Оформляем...' : neitherEnabled ? 'Недоступно' : 'Оформить заказ'}
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
