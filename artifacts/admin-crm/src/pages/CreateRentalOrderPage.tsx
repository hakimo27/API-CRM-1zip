import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, Plus, Trash2, Search, Loader2, User, Calendar,
  Package, MapPin, MessageSquare, CheckCircle, AlertCircle,
} from 'lucide-react';
import { PhoneInput } from '@/components/PhoneInput';

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

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

interface OrderItem {
  productId: number;
  productName: string;
  pricePerDay: number;
  quantity: number;
  startDate: string;
  endDate: string;
  totalPrice: number;
  available: boolean | null;
  checkingAvailability: boolean;
}

function calcDays(start: string, end: string) {
  if (!start || !end) return 0;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
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

  const checkAvailability = useCallback(async (item: OrderItem, index: number) => {
    if (!item.startDate || !item.endDate || !item.productId) return;
    setItems(prev => prev.map((it, i) => i === index ? { ...it, checkingAvailability: true } : it));
    try {
      const res: any = await api.get(
        `/availability/product?productId=${item.productId}&startDate=${item.startDate}&endDate=${item.endDate}&quantity=${item.quantity}`
      );
      setItems(prev => prev.map((it, i) => {
        if (i !== index) return it;
        const days = calcDays(it.startDate, it.endDate);
        return { ...it, available: res.available, checkingAvailability: false, totalPrice: it.pricePerDay * days * it.quantity };
      }));
    } catch {
      setItems(prev => prev.map((it, i) => i === index ? { ...it, checkingAvailability: false, available: null } : it));
    }
  }, []);

  const addProduct = (product: any) => {
    const newItem: OrderItem = {
      productId: product.id,
      productName: product.name,
      pricePerDay: Number(product.pricePerDay || product.price || 0),
      quantity: 1,
      startDate: startDate || '',
      endDate: endDate || '',
      totalPrice: 0,
      available: null,
      checkingAvailability: false,
    };
    const days = calcDays(newItem.startDate, newItem.endDate);
    newItem.totalPrice = newItem.pricePerDay * days * newItem.quantity;
    const newItems = [...items, newItem];
    setItems(newItems);
    setProductSearch('');
    setShowProductSearch(false);
    if (newItem.startDate && newItem.endDate) {
      setTimeout(() => checkAvailability(newItem, newItems.length - 1), 100);
    }
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    setItems(prev => {
      const updated = prev.map((it, i) => {
        if (i !== index) return it;
        const newIt = { ...it, [field]: value };
        if (field === 'quantity' || field === 'startDate' || field === 'endDate') {
          const days = calcDays(newIt.startDate, newIt.endDate);
          newIt.totalPrice = newIt.pricePerDay * days * newIt.quantity;
          newIt.available = null;
        }
        return newIt;
      });
      const item = updated[index];
      if ((field === 'quantity' || field === 'startDate' || field === 'endDate') && item.startDate && item.endDate) {
        setTimeout(() => checkAvailability(item, index), 500);
      }
      return updated;
    });
  };

  const applyDatesToAll = () => {
    setItems(prev => prev.map(it => {
      const days = calcDays(startDate, endDate);
      return { ...it, startDate, endDate, totalPrice: it.pricePerDay * days * it.quantity, available: null };
    }));
    items.forEach((_, i) => setTimeout(() => checkAvailability({ ...items[i], startDate, endDate }, i), 200 * i));
  };

  const totalAmount = items.reduce((sum, it) => sum + (it.totalPrice || 0), 0);
  const allAvailable = items.length > 0 && items.every(it => it.available !== false);
  const hasUnavailable = items.some(it => it.available === false);

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
        totalPrice: it.totalPrice,
      })),
    }),
    onSuccess: (res: any) => {
      toast({ title: 'Заказ создан', description: `Номер: ${res.orderNumber || res.id}` });
      navigate(res.id ? `/orders/${res.id}` : '/orders');
    },
    onError: (e: any) => toast({ title: 'Ошибка создания заказа', description: e.message, variant: 'destructive' }),
  });

  const canSubmit = customerName.trim() && items.length > 0 && !hasUnavailable;

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
          <F label="Email" >
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
        {startDate && endDate && items.length > 0 && (
          <button onClick={applyDatesToAll}
            className="text-xs text-blue-600 hover:underline">
            Применить даты ко всем товарам
          </button>
        )}
        {startDate && endDate && (
          <div className="text-sm text-gray-500 bg-blue-50 px-3 py-2 rounded-lg">
            Длительность: <strong>{calcDays(startDate, endDate)} дн.</strong>
          </div>
        )}
      </Section>

      {/* Products */}
      <Section title="Товары" icon={Package}>
        {items.length > 0 && (
          <div className="space-y-2 mb-3">
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
                      <span className="text-xs text-red-600 flex-shrink-0">нет в наличии</span>
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
                <div className="mt-2 text-right text-sm text-gray-600">
                  {item.pricePerDay > 0 && (
                    <span className="text-gray-400 text-xs">{item.pricePerDay.toLocaleString('ru-RU')} ₽/день × {item.quantity} шт. × {calcDays(item.startDate, item.endDate)} дн. = </span>
                  )}
                  <span className="font-semibold text-gray-900">{item.totalPrice.toLocaleString('ru-RU')} ₽</span>
                </div>
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
            <p className="text-sm text-red-700">Некоторые товары недоступны на выбранные даты. Измените даты или уберите недоступные товары.</p>
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Итого</h3>
          <div className="text-2xl font-bold text-gray-900">{totalAmount.toLocaleString('ru-RU')} ₽</div>
        </div>
        {items.length > 0 && (
          <div className="text-sm text-gray-500 space-y-1 mb-4">
            {items.map((it, i) => (
              <div key={i} className="flex justify-between">
                <span>{it.productName} × {it.quantity}</span>
                <span>{it.totalPrice.toLocaleString('ru-RU')} ₽</span>
              </div>
            ))}
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
        {!customerName.trim() && (
          <p className="text-xs text-red-500 mt-2 text-center">Укажите имя клиента</p>
        )}
        {items.length === 0 && (
          <p className="text-xs text-red-500 mt-2 text-center">Добавьте хотя бы один товар</p>
        )}
      </div>
    </div>
  );
}
