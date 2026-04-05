import { useState } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Shield, Calendar, Minus, Plus, ShoppingCart, Check, Info } from 'lucide-react';
import { api } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { differenceInCalendarDays, addDays, format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Tariff {
  id: number; type: string; label: string;
  pricePerDay: number; minDays: number | null; description: string | null;
}

interface ProductDetail {
  id: number; name: string; slug: string; sku: string | null;
  categoryId: number; categoryName: string; shortDescription: string | null;
  fullDescription: string | null; capacity: number | null;
  constructionType: string | null; weight: string | null; dimensions: string | null;
  kit: string | null; depositAmount: number | null; featured: boolean;
  badge: string | null; tariffs: Tariff[];
  images: Array<{ id: number; url: string; alt: string | null }>;
}

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const { addItem } = useCart();

  const today = new Date();
  const [startDate, setStartDate] = useState(format(addDays(today, 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(today, 3), 'yyyy-MM-dd'));
  const [quantity, setQuantity] = useState(1);
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);
  const [added, setAdded] = useState(false);

  const { data: product, isLoading, error } = useQuery<ProductDetail>({
    queryKey: ['product', slug],
    queryFn: () => api.get(`/products/${slug}`),
    enabled: !!slug,
    onSuccess: (data) => {
      if (data.tariffs?.length && !selectedTariff) {
        setSelectedTariff(data.tariffs[0]);
      }
    },
  });

  const days = startDate && endDate
    ? Math.max(1, differenceInCalendarDays(new Date(endDate), new Date(startDate)))
    : 1;

  const price = selectedTariff ? selectedTariff.pricePerDay * days * quantity : 0;

  const handleAddToCart = () => {
    if (!product || !selectedTariff) return;
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: null,
      tariffId: selectedTariff.id,
      tariffLabel: selectedTariff.label,
      pricePerDay: selectedTariff.pricePerDay,
      quantity,
      startDate,
      endDate,
      days,
      totalPrice: price,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (isLoading) return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="h-96 bg-gray-200 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );

  if (error || !product) return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <div className="text-6xl mb-4">😕</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Товар не найден</h2>
      <Link href="/catalog" className="text-blue-600 hover:underline">Вернуться в каталог</Link>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/catalog" className="inline-flex items-center gap-1 text-gray-500 hover:text-blue-600 mb-6 transition-colors text-sm">
        <ChevronLeft className="w-4 h-4" />
        Каталог
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image */}
        <div>
          <div className="h-80 md:h-[420px] bg-gradient-to-br from-blue-100 to-cyan-50 rounded-2xl overflow-hidden relative">
            {product.badge && (
              <span className="absolute top-4 left-4 z-10 px-3 py-1 bg-blue-600 text-white text-sm font-bold rounded-full">
                {product.badge}
              </span>
            )}
            {product.images?.[0]?.url ? (
              <img
                src={product.images[0].url}
                alt={product.images[0].alt || product.name}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-9xl opacity-40">🛶</span>
              </div>
            )}
          </div>
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {product.images.map((img, idx) => (
                <img
                  key={img.id}
                  src={img.url}
                  alt={img.alt || `${product.name} ${idx + 1}`}
                  className="h-16 w-20 object-cover rounded-lg border-2 border-transparent hover:border-blue-400 cursor-pointer flex-shrink-0"
                />
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="text-sm text-blue-600 font-medium mb-2">{product.categoryName}</div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{product.name}</h1>
          {product.shortDescription && (
            <p className="text-gray-600 mb-4">{product.shortDescription}</p>
          )}

          {/* Specs */}
          {(product.capacity || product.constructionType || product.weight) && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {product.capacity && (
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-blue-700">{product.capacity}</div>
                  <div className="text-xs text-gray-500">мест</div>
                </div>
              )}
              {product.constructionType && (
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <div className="text-sm font-bold text-blue-700">{product.constructionType}</div>
                  <div className="text-xs text-gray-500">конструкция</div>
                </div>
              )}
              {product.weight && (
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <div className="text-sm font-bold text-blue-700">{product.weight}</div>
                  <div className="text-xs text-gray-500">вес</div>
                </div>
              )}
            </div>
          )}

          {/* Tariffs */}
          {product.tariffs?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Тарифы</h3>
              <div className="grid gap-2">
                {product.tariffs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTariff(t)}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${
                      selectedTariff?.id === t.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div>
                      <span className="font-medium text-gray-900">{t.label}</span>
                      {t.minDays && <span className="text-xs text-gray-500 ml-2">от {t.minDays} дней</span>}
                      {t.description && <div className="text-xs text-gray-500">{t.description}</div>}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-700">{t.pricePerDay.toLocaleString('ru-RU')} ₽</div>
                      <div className="text-xs text-gray-400">в день</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Дата начала</label>
              <input
                type="date"
                value={startDate}
                min={format(addDays(today, 1), 'yyyy-MM-dd')}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Дата окончания</label>
              <input
                type="date"
                value={endDate}
                min={startDate || format(addDays(today, 2), 'yyyy-MM-dd')}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm font-medium text-gray-700">Количество:</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100">
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-medium">{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Price + CTA */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-600">{days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'} × {quantity} шт.</span>
              <span className="text-2xl font-bold text-blue-700">{price.toLocaleString('ru-RU')} ₽</span>
            </div>
            {product.depositAmount && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Shield className="w-3 h-3" />
                Залог: {product.depositAmount.toLocaleString('ru-RU')} ₽ (возвращается)
              </div>
            )}
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!selectedTariff}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-lg transition-all ${
              added
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {added ? <Check className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
            {added ? 'Добавлено в корзину!' : 'Добавить в корзину'}
          </button>
        </div>
      </div>

      {/* Full Description */}
      {product.fullDescription && (
        <div className="mt-12 prose max-w-none">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Описание</h2>
          <p className="text-gray-600 leading-relaxed">{product.fullDescription}</p>
        </div>
      )}

      {/* Kit */}
      {product.kit && (
        <div className="mt-8 bg-blue-50 rounded-2xl p-6">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" />
            Комплектация
          </h3>
          <p className="text-gray-700">{product.kit}</p>
        </div>
      )}
    </div>
  );
}
