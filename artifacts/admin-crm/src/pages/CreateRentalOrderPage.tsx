import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, Plus, Trash2, Search, Loader2, User, Calendar,
  Package, MapPin, MessageSquare, CheckCircle, AlertCircle, Tag, Banknote,
} from 'lucide-react';
import { PhoneInput } from '@/components/PhoneInput';

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

const TARIFF_LABELS: Record<string, string> = {
  weekday: 'Будни',
  weekend: 'Выходные',
  week: 'Неделя (7+ дней)',
  may_holidays: 'Майские праздники',
};

function F({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

type PricingStatus = 'idle' | 'loading' | 'ok' | 'no_dates' | 'no_tariff' | 'error';

interface Pricing {
  basePrice: number;
  totalPrice: number;
  days: number;
  tariffType: string;
  deposit: number;
  tariffFound: boolean;
}

interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  startDate: string;
  endDate: string;
  available: boolean | null;
  checkingAvailability: boolean;
  pricingStatus: PricingStatus;
  pricing: Pricing | null;
}

function calcDays(start: string, end: string) {
  if (!start || !end) return 0;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function itemTotal(item: OrderItem): number {
  if (!item.pricing || !item.pricing.tariffFound) return 0;
  return item.pricing.totalPrice * item.quantity;
}

function itemDeposit(item: OrderItem): number {
  if (!item.pricing) return 0;
  return item.pricing.deposit * item.quantity;
}

function PricingInfo({ item }: { item: OrderItem }) {
  if (!item.startDate || !item.endDate) {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1.5 rounded-lg">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
        Заполните даты аренды для расчёта цены
      </div>
    );
  }
  if (item.pricingStatus === 'loading') {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Рассчитываем стоимость...
      </div>
    );
  }
  if (item.pricingStatus === 'no_tariff') {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded-lg">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
        Нет подходящего тарифа для выбранных дат
      </div>
    );
  }
  if (item.pricingStatus === 'error') {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded-lg">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
        Ошибка расчёта цены — проверьте даты или тарифы
      </div>
    );
  }
  if (item.pricingStatus === 'ok' && item.pricing) {
    const p = item.pricing;
    const total = p.totalPrice * item.quantity;
    const dep = p.deposit * item.quantity;
    return (
      <div className="mt-2 bg-blue-50 rounded-lg px-3 py-2 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-blue-700">
            <Tag className="w-3.5 h-3.5" />
            {TARIFF_LABELS[p.tariffType] || p.tariffType}
          </span>
          <span className="text-gray-500">{p.basePrice.toLocaleString('ru-RU')} ₽/день × {p.days} дн. × {item.quantity} шт.</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 flex items-center gap-1">
            <Banknote className="w-3.5 h-3.5" />
            Залог
          </span>
          <span className="text-gray-700 font-medium">{dep.toLocaleString('ru-RU')} ₽</span>
        </div>
        <div className="flex items-center justify-between border-t border-blue-100 pt-1 mt-1">
          <span className="text-sm font-semibold text-blue-900">Итого по позиции</span>
          <span className="text-sm font-bold text-blue-900">{total.toLocaleString('ru-RU')} ₽</span>
        </div>
      </div>
    );
  }
  return null;
}

export default function CreateRentalOrderPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup');
  const [pickupBranchId, setPickupBranchId] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [managerComment, setManagerComment] = useState('');
  const [customerComment, setCustomerComment] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);

  const pricingTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['products-admin'],
    queryFn: () => api.get('/products/admin'),
  });

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches/admin'),
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers'),
  });

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) && p.active !== false
  );

  const filteredCustomers = customers.filter((c: any) =>
    (c.name || c.fullName || '')?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch)
  );

  const fetchPricing = useCallback(async (item: OrderItem, index: number) => {
    if (!item.startDate || !item.endDate || !item.productId) {
      setItems(prev => prev.map((it, i) => i === index ? { ...it, pricingStatus: 'no_dates' as PricingStatus, pricing: null } : it));
      return;
    }
    setItems(prev => prev.map((it, i) => i === index ? { ...it, pricingStatus: 'loading' as PricingStatus } : it));
    try {
      const res: any = await api.get(
        `/availability/pricing?productId=${item.productId}&startDate=${item.startDate}&endDate=${item.endDate}`
      );
      setItems(prev => prev.map((it, i) => {
        if (i !== index) return it;
        const found = res.tariffFound !== false && res.basePrice > 0;
        return { ...it, pricing: res, pricingStatus: found ? 'ok' : 'no_tariff' };
      }));
    } catch {
      setItems(prev => prev.map((it, i) => i === index ? { ...it, pricingStatus: 'error' as PricingStatus, pricing: null } : it));
    }
  }, []);

  const fetchAvailability = useCallback(async (item: OrderItem, index: number) => {
    if (!item.startDate || !item.endDate || !item.productId) return;
    setItems(prev => prev.map((it, i) => i === index ? { ...it, checkingAvailability: true } : it));
    try {
      const res: any = await api.get(
        `/availability/product?productId=${item.productId}&startDate=${item.startDate}&endDate=${item.endDate}&quantity=${item.quantity}`
      );
      setItems(prev => prev.map((it, i) => i === index ? { ...it, available: res.available, checkingAvailability: false } : it));
    } catch {
      setItems(prev => prev.map((it, i) => i === index ? { ...it, checkingAvailability: false, available: null } : it));
    }
  }, []);

  const schedulePricing = useCallback((item: OrderItem, index: number) => {
    if (pricingTimers.current[index]) clearTimeout(pricingTimers.current[index]);
    pricingTimers.current[index] = setTimeout(() => {
      fetchPricing(item, index);
      fetchAvailability(item, index);
    }, 500);
  }, [fetchPricing, fetchAvailability]);

  const addProduct = (product: any) => {
    const newItem: OrderItem = {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      startDate: startDate || '',
      endDate: endDate || '',
      available: null,
      checkingAvailability: false,
      pricingStatus: (startDate && endDate) ? 'loading' : 'no_dates',
      pricing: null,
    };
    setItems(prev => {
      const updated = [...prev, newItem];
      const idx = updated.length - 1;
      setTimeout(() => schedulePricing(newItem, idx), 50);
      return updated;
    });
    setProductSearch('');
    setShowProductSearch(false);
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    setItems(prev => {
      const updated = prev.map((it, i) => {
        if (i !== index) return it;
        const newIt = { ...it, [field]: value };
        if (field === 'quantity' || field === 'startDate' || field === 'endDate') {
          newIt.available = null;
          newIt.pricingStatus = (!newIt.startDate || !newIt.endDate) ? 'no_dates' : 'loading';
        }
        return newIt;
      });
      const item = updated[index];
      if (field === 'quantity' || field === 'startDate' || field === 'endDate') {
        schedulePricing(item, index);
      }
      return updated;
    });
  };

  const applyDatesToAll = () => {
    if (!startDate || !endDate) return;
    setItems(prev => {
      const updated = prev.map(it => ({ ...it, startDate, endDate, available: null, pricingStatus: 'loading' as PricingStatus }));
      updated.forEach((item, i) => setTimeout(() => schedulePricing(item, i), 200 * i));
      return updated;
    });
  };

  const totalAmount = items.reduce((sum, it) => sum + itemTotal(it), 0);
  const totalDeposit = items.reduce((sum, it) => sum + itemDeposit(it), 0);
  const hasUnavailable = items.some(it => it.available === false);
  const hasPricingIssue = items.some(it => it.pricingStatus === 'no_tariff' || it.pricingStatus === 'error');
  const hasPendingPricing = items.some(it => it.pricingStatus === 'loading');
  const allPricingOk = items.length > 0 && items.every(it => it.pricingStatus === 'ok');

  const createMut = useMutation({
    mutationFn: () => api.post('/orders', {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      deliveryType,
      pickupPointId: deliveryType === 'pickup' && pickupBranchId ? Number(pickupBranchId) : undefined,
      deliveryAddress: deliveryType === 'delivery' ? deliveryAddress : undefined,
      managerComment: managerComment.trim() || undefined,
      customerComment: customerComment.trim() || undefined,
      totalAmount,
      items: items.map(it => ({
        productId: it.productId,
        quantity: it.quantity,
        startDate: it.startDate || undefined,
        endDate: it.endDate || undefined,
        totalPrice: itemTotal(it),
      })),
    }),
    onSuccess: (res: any) => {
      toast({ title: 'Заказ создан', description: `Номер: ${res.orderNumber || res.id}` });
      navigate(res.id ? `/orders/${res.id}` : '/orders');
    },
    onError: (e: any) => toast({ title: 'Ошибка создания заказа', description: e.message, variant: 'destructive' }),
  });

  const canSubmit = customerName.trim() && items.length > 0 && !hasUnavailable && !hasPricingIssue && !hasPendingPricing;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/orders')}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-gray-900 text-lg">Создать заказ аренды</h1>
          <p className="text-sm text-gray-400">Ручное оформление заказа менеджером</p>
        </div>
      </div>

      {/* Customer */}
      <Section title="Клиент" icon={User}>
        <div className="relative">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={customerSearch}
                onChange={e => { setCustomerSearch(e.target.value); setShowCustomerSearch(true); }}
                onFocus={() => setShowCustomerSearch(true)}
                placeholder="Поиск по базе клиентов..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <button onClick={() => { setShowCustomerSearch(false); setCustomerSearch(''); }}
              className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
              Вручную
            </button>
          </div>
          {showCustomerSearch && customerSearch && filteredCustomers.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              {filteredCustomers.slice(0, 5).map((c: any) => (
                <button key={c.id} onClick={() => {
                  setCustomerName(c.name || c.fullName || '');
                  setCustomerPhone(c.phone || '');
                  setCustomerEmail(c.email || '');
                  setShowCustomerSearch(false);
                  setCustomerSearch('');
                }}
                  className="w-full flex items-start gap-2 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0">
                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0 mt-0.5">
                    {(c.name || c.fullName || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{c.name || c.fullName}</div>
                    <div className="text-xs text-gray-400">{c.phone} {c.email}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <F label="Имя клиента *">
            <input value={customerName} onChange={e => setCustomerName(e.target.value)}
              placeholder="Иван Иванов" className={inputCls} />
          </F>
          <F label="Телефон">
            <PhoneInput value={customerPhone} onChange={setCustomerPhone} className={inputCls} />
          </F>
          <F label="Email">
            <input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
              placeholder="ivan@example.com" type="email" className={inputCls} />
          </F>
        </div>
      </Section>

      {/* Dates */}
      <Section title="Период аренды" icon={Calendar}>
        <div className="grid grid-cols-2 gap-3">
          <F label="Дата начала">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
          </F>
          <F label="Дата окончания">
            <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} className={inputCls} />
          </F>
        </div>
        {startDate && endDate && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 bg-blue-50 px-3 py-2 rounded-lg">
              Длительность: <strong>{calcDays(startDate, endDate)} дн.</strong>
            </div>
            {items.length > 0 && (
              <button onClick={applyDatesToAll}
                className="text-xs text-blue-600 hover:underline">
                Применить ко всем товарам
              </button>
            )}
          </div>
        )}
      </Section>

      {/* Products */}
      <Section title="Товары и расчёт" icon={Package}>
        {items.length > 0 && (
          <div className="space-y-3 mb-3">
            {items.map((item, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.checkingAvailability ? (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                    ) : item.available === true ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : item.available === false ? (
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                    )}
                    <span className="font-medium text-sm text-gray-900 truncate">{item.productName}</span>
                    {item.available === false && (
                      <span className="text-xs text-red-600 flex-shrink-0 bg-red-50 px-1.5 py-0.5 rounded">нет в наличии</span>
                    )}
                  </div>
                  <button onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-gray-400 hover:text-red-500 flex-shrink-0 p-0.5">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Кол-во</label>
                    <input type="number" min={1} value={item.quantity}
                      onChange={e => updateItem(i, 'quantity', Math.max(1, Number(e.target.value)))}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Нач. дата</label>
                    <input type="date" value={item.startDate}
                      onChange={e => updateItem(i, 'startDate', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Кон. дата</label>
                    <input type="date" value={item.endDate} min={item.startDate}
                      onChange={e => updateItem(i, 'endDate', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <PricingInfo item={item} />
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <button onClick={() => setShowProductSearch(true)}
            className="flex items-center gap-2 w-full px-3 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
            <Plus className="w-4 h-4" /> Добавить товар
          </button>
          {showProductSearch && (
            <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-lg z-10 relative">
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="Поиск товара..."
                    autoFocus
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto">
                {filteredProducts.slice(0, 10).map(p => (
                  <button key={p.id} onClick={() => addProduct(p)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-900">{p.name}</span>
                    <span className="text-xs text-gray-400">{Number(p.pricePerDay || p.price || 0).toLocaleString('ru-RU')} ₽/день</span>
                  </button>
                ))}
                {filteredProducts.length === 0 && (
                  <div className="px-4 py-4 text-sm text-gray-400 text-center">Товары не найдены</div>
                )}
              </div>
              <div className="p-2 border-t border-gray-100">
                <button onClick={() => setShowProductSearch(false)}
                  className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-700">
                  Закрыть
                </button>
              </div>
            </div>
          )}
        </div>

        {hasUnavailable && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">Некоторые товары недоступны на выбранные даты</p>
          </div>
        )}
        {hasPricingIssue && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-700">Для некоторых товаров не найден тариф — создание заказа недоступно</p>
          </div>
        )}
      </Section>

      {/* Delivery */}
      <Section title="Получение" icon={MapPin}>
        <div className="flex gap-3">
          {(['pickup', 'delivery'] as const).map(type => (
            <button key={type} onClick={() => setDeliveryType(type)}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium border-2 transition-all ${
                deliveryType === type
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}>
              {type === 'pickup' ? '📍 Самовывоз' : '🚚 Доставка'}
            </button>
          ))}
        </div>

        {deliveryType === 'pickup' && (
          <F label="Точка самовывоза">
            <select value={pickupBranchId} onChange={e => setPickupBranchId(e.target.value)} className={inputCls}>
              <option value="">— Выберите точку —</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name} — {b.city}</option>
              ))}
            </select>
          </F>
        )}

        {deliveryType === 'delivery' && (
          <F label="Адрес доставки">
            <input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}
              placeholder="Город, улица, дом, квартира" className={inputCls} />
          </F>
        )}
      </Section>

      {/* Notes */}
      <Section title="Комментарии" icon={MessageSquare}>
        <F label="Комментарий менеджера">
          <textarea value={managerComment} onChange={e => setManagerComment(e.target.value)}
            rows={2} placeholder="Внутренняя заметка, видна только в CRM..."
            className={inputCls + ' resize-none'} />
        </F>
        <F label="Комментарий клиента">
          <textarea value={customerComment} onChange={e => setCustomerComment(e.target.value)}
            rows={2} placeholder="Пожелания клиента..."
            className={inputCls + ' resize-none'} />
        </F>
      </Section>

      {/* Summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Итоги заказа</h3>

        {items.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">Добавьте товары, чтобы увидеть расчёт</p>
        )}

        {items.length > 0 && (
          <div className="space-y-2 mb-4">
            {items.map((it, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {it.productName} × {it.quantity}
                  {it.pricing && it.pricing.tariffFound && (
                    <span className="text-xs text-gray-400 ml-1">({TARIFF_LABELS[it.pricing.tariffType] || it.pricing.tariffType})</span>
                  )}
                </span>
                <span className={it.pricingStatus === 'ok' ? 'font-medium text-gray-900' : 'text-gray-300 italic text-xs self-center'}>
                  {it.pricingStatus === 'ok'
                    ? `${itemTotal(it).toLocaleString('ru-RU')} ₽`
                    : it.pricingStatus === 'loading'
                      ? 'Расчёт...'
                      : it.pricingStatus === 'no_dates'
                        ? 'Укажите даты'
                        : 'Нет тарифа'}
                </span>
              </div>
            ))}

            <div className="border-t border-gray-100 pt-2 mt-2 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Аренда (subtotal)</span>
                <span className={allPricingOk ? 'font-medium text-gray-900' : 'text-gray-300'}>
                  {allPricingOk ? `${totalAmount.toLocaleString('ru-RU')} ₽` : '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Залог (итого)</span>
                <span className={allPricingOk ? 'font-medium text-gray-900' : 'text-gray-300'}>
                  {allPricingOk ? `${totalDeposit.toLocaleString('ru-RU')} ₽` : '—'}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-gray-100 pt-2 mt-1">
                <span className="text-gray-900">Итого к оплате</span>
                <span className={allPricingOk ? 'text-blue-700' : 'text-gray-300'}>
                  {allPricingOk ? `${totalAmount.toLocaleString('ru-RU')} ₽` : 'Цена не рассчитана'}
                </span>
              </div>
            </div>
          </div>
        )}

        {hasPendingPricing && (
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Пересчёт стоимости...
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => navigate('/orders')}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            Отмена
          </button>
          <button
            onClick={() => createMut.mutate()}
            disabled={!canSubmit || createMut.isPending}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {createMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {createMut.isPending ? 'Создание...' : 'Создать заказ'}
          </button>
        </div>

        <div className="mt-2 space-y-1">
          {!customerName.trim() && (
            <p className="text-xs text-red-500 text-center">Укажите имя клиента</p>
          )}
          {items.length === 0 && (
            <p className="text-xs text-red-500 text-center">Добавьте хотя бы один товар</p>
          )}
          {hasPricingIssue && (
            <p className="text-xs text-amber-600 text-center">Исправьте ошибки расчёта цены</p>
          )}
          {hasPendingPricing && (
            <p className="text-xs text-gray-400 text-center">Дождитесь завершения расчёта</p>
          )}
        </div>
      </div>
    </div>
  );
}
