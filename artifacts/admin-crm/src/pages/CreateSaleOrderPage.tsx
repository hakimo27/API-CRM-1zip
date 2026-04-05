import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, Plus, Trash2, Search, Loader2, User, Package,
  MapPin, MessageSquare,
} from 'lucide-react';
import { PhoneInput } from '@/components/PhoneInput';

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
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

interface SaleItem {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
}

export default function CreateSaleOrderPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [customerName, setCustomerName] = useState(() => urlParams.get('customerName') || '');
  const [customerPhone, setCustomerPhone] = useState(() => urlParams.get('customerPhone') || '');
  const [customerEmail, setCustomerEmail] = useState(() => urlParams.get('customerEmail') || '');
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [managerComment, setManagerComment] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['sale-products-admin'],
    queryFn: () => api.get('/sales/products/admin'),
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers'),
  });

  const filteredProducts = products.filter((p: any) =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) && p.active !== false
  );

  const filteredCustomers = customers.filter((c: any) =>
    (c.name || c.fullName || '')?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone || '').includes(customerSearch) ||
    (c.email || '').toLowerCase().includes(customerSearch.toLowerCase())
  );

  const addProduct = (product: any) => {
    const existing = items.findIndex(it => it.productId === product.id);
    if (existing >= 0) {
      setItems(prev => prev.map((it, i) => i === existing ? { ...it, quantity: it.quantity + 1 } : it));
    } else {
      setItems(prev => [...prev, {
        productId: product.id,
        productName: product.name,
        price: Number(product.price || 0),
        quantity: 1,
      }]);
    }
    setProductSearch('');
    setShowProductSearch(false);
  };

  const totalAmount = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const canSubmit = customerName.trim() && items.length > 0;

  const createMut = useMutation({
    mutationFn: () => api.post('/sales/orders', {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      deliveryType,
      deliveryAddress: deliveryType === 'delivery' ? deliveryAddress : undefined,
      managerComment: managerComment.trim() || undefined,
      items: items.map(it => ({ productId: it.productId, quantity: it.quantity })),
    }),
    onSuccess: (res: any) => {
      toast({ title: 'Заказ продажи создан', description: `Номер: ${res.orderNumber || res.id}` });
      navigate('/sale-orders');
    },
    onError: (e: any) => toast({ title: 'Ошибка создания заказа', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/sale-orders')}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-gray-900 text-lg">Создать заказ продажи</h1>
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

      {/* Products */}
      <Section title="Товары" icon={Package}>
        {items.length > 0 && (
          <div className="space-y-2 mb-3">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">{item.productName}</div>
                  <div className="text-xs text-gray-400">{item.price.toLocaleString('ru-RU')} ₽/шт.</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, quantity: Math.max(1, it.quantity - 1) } : it))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100">−</button>
                  <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                  <button onClick={() => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, quantity: it.quantity + 1 } : it))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100">+</button>
                </div>
                <div className="text-sm font-semibold text-gray-900 w-24 text-right flex-shrink-0">
                  {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                </div>
                <button onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                  className="text-gray-400 hover:text-red-500 flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
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
                {filteredProducts.slice(0, 10).map((p: any) => (
                  <button key={p.id} onClick={() => addProduct(p)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-900">{p.name}</span>
                    <span className="text-xs text-gray-400">{Number(p.price || 0).toLocaleString('ru-RU')} ₽</span>
                  </button>
                ))}
                {filteredProducts.length === 0 && (
                  <div className="px-4 py-4 text-sm text-gray-400 text-center">Товары не найдены</div>
                )}
              </div>
              <div className="p-2 border-t border-gray-100">
                <button onClick={() => setShowProductSearch(false)}
                  className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-700">Закрыть</button>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Delivery */}
      <Section title="Получение" icon={MapPin}>
        <div className="flex gap-3">
          {(['pickup', 'delivery'] as const).map(type => (
            <button key={type} onClick={() => setDeliveryType(type)}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium border-2 transition-all ${
                deliveryType === type ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}>
              {type === 'pickup' ? '📍 Самовывоз' : '🚚 Доставка'}
            </button>
          ))}
        </div>
        {deliveryType === 'delivery' && (
          <F label="Адрес доставки">
            <input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}
              placeholder="Город, улица, дом, квартира" className={inputCls} />
          </F>
        )}
      </Section>

      {/* Notes */}
      <Section title="Комментарий" icon={MessageSquare}>
        <F label="Примечание к заказу">
          <textarea value={managerComment} onChange={e => setManagerComment(e.target.value)}
            rows={2} placeholder="Внутренняя заметка..."
            className={inputCls + ' resize-none'} />
        </F>
      </Section>

      {/* Summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Итого</h3>
          <div className="text-2xl font-bold text-gray-900">{totalAmount.toLocaleString('ru-RU')} ₽</div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/sale-orders')}
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
        {!canSubmit && (
          <p className="text-xs text-red-500 mt-2 text-center">
            {!customerName.trim() ? 'Укажите имя клиента' : 'Добавьте товары'}
          </p>
        )}
      </div>
    </div>
  );
}
