import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useSaleCart } from '@/contexts/SaleCartContext';
import { api } from '@/lib/api';
import { Package, ChevronLeft, CheckCircle, MapPin, Truck, ShoppingBag, Loader2 } from 'lucide-react';
import { PhoneInput } from '@/components/PhoneInput';

type DeliveryMethod = 'pickup' | 'delivery';

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

export default function SaleCheckoutPage() {
  const { items, totalAmount, clearCart } = useSaleCart();
  const [, navigate] = useLocation();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pickup');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successOrder, setSuccessOrder] = useState<{ orderNumber: string; id: number } | null>(null);

  if (items.length === 0 && !successOrder) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Корзина пуста</h2>
        <Link href="/sale" className="text-blue-600 hover:underline text-sm">Перейти в каталог продажи</Link>
      </div>
    );
  }

  if (successOrder) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-20 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Заказ оформлен!</h1>
        <p className="text-gray-500 mb-1">Номер вашего заказа:</p>
        <p className="text-2xl font-mono font-bold text-blue-700 mb-6">{successOrder.orderNumber}</p>
        <p className="text-gray-500 mb-8">
          Наш менеджер свяжется с вами в ближайшее время для подтверждения заказа и уточнения деталей оплаты.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/sale"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
            Продолжить покупки
          </Link>
          <Link href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">
            На главную
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Укажите имя и телефон');
      return;
    }
    if (deliveryMethod === 'delivery' && !address.trim()) {
      setError('Укажите адрес доставки');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const payload = {
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim() || undefined,
        deliveryMethod,
        deliveryAddress: {
          name: name.trim(),
          phone: phone.trim(),
          address: deliveryMethod === 'delivery' ? address.trim() : 'Самовывоз',
          city: city.trim() || 'Москва',
        },
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        notes: notes.trim() || undefined,
      };

      const order = await api.post('/sales/orders', payload);
      clearCart();
      setSuccessOrder({ orderNumber: order.orderNumber, id: order.id });
    } catch (err: any) {
      setError(err?.message || 'Ошибка при оформлении заказа. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/sale/cart" className="p-2 -ml-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Оформление заказа</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: forms */}
          <div className="lg:col-span-2 space-y-5">
            {/* Customer */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                Контактные данные
              </h2>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Имя *</label>
                  <input value={name} onChange={e => setName(e.target.value)} className={inputCls}
                    placeholder="Ваше имя" required />
                </div>
                <div>
                  <label className={labelCls}>Телефон *</label>
                  <PhoneInput value={phone} onChange={setPhone} required className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} className={inputCls}
                    type="email" placeholder="email@example.com" />
                </div>
              </div>
            </div>

            {/* Delivery */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                Способ получения
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { value: 'pickup', label: 'Самовывоз', icon: MapPin, desc: 'Забрать из шоурума' },
                  { value: 'delivery', label: 'Доставка', icon: Truck, desc: 'Доставим по адресу' },
                ].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setDeliveryMethod(opt.value as DeliveryMethod)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      deliveryMethod === opt.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <opt.icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${deliveryMethod === opt.value ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div>
                      <div className={`font-medium text-sm ${deliveryMethod === opt.value ? 'text-blue-700' : 'text-gray-700'}`}>{opt.label}</div>
                      <div className="text-xs text-gray-400">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              {deliveryMethod === 'delivery' && (
                <div className="space-y-3 border-t border-gray-100 pt-4">
                  <div>
                    <label className={labelCls}>Город</label>
                    <input value={city} onChange={e => setCity(e.target.value)} className={inputCls} placeholder="Москва" />
                  </div>
                  <div>
                    <label className={labelCls}>Адрес доставки *</label>
                    <input value={address} onChange={e => setAddress(e.target.value)} className={inputCls}
                      placeholder="Улица, дом, квартира" />
                  </div>
                </div>
              )}

              {deliveryMethod === 'pickup' && (
                <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 inline mr-1 text-blue-500" />
                  Адрес шоурума и режим работы можно узнать в разделе{' '}
                  <Link href="/info/contacts" className="text-blue-600 hover:underline">Контакты</Link>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                Комментарий к заказу
              </h2>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                className={inputCls + ' resize-none'} rows={3}
                placeholder="Особые пожелания, удобное время звонка..." />
            </div>
          </div>

          {/* Right: order summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-24">
              <h2 className="font-semibold text-gray-900 mb-4">Ваш заказ</h2>
              <div className="space-y-3 mb-4">
                {items.map(item => (
                  <div key={item.productId} className="flex gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0 flex items-center justify-center">
                      {item.image
                        ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        : <Package className="w-5 h-5 text-gray-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 line-clamp-1">{item.name}</div>
                      <div className="text-xs text-gray-400">{item.quantity} шт. × {item.price.toLocaleString('ru-RU')} ₽</div>
                      <div className="text-sm font-semibold text-gray-900">{(item.price * item.quantity).toLocaleString('ru-RU')} ₽</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-2 mb-5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Товары ({items.length})</span>
                  <span>{totalAmount.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Доставка</span>
                  <span className="text-gray-400">уточняется</span>
                </div>
                <div className="flex justify-between items-center font-bold text-gray-900 pt-1 border-t border-gray-100">
                  <span>Итого</span>
                  <span className="text-lg">{totalAmount.toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>

              {error && (
                <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Оформляем...</> : 'Оформить заказ'}
              </button>

              <p className="text-xs text-gray-400 text-center mt-3">
                Нажимая «Оформить», вы соглашаетесь с условиями{' '}
                <Link href="/info/terms" className="underline">договора</Link>
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
