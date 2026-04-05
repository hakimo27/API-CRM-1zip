import { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ChevronLeft, Package, CheckCircle, Phone, ShoppingBag, AlertCircle, MessageSquare } from 'lucide-react';

interface SaleProduct {
  id: number;
  name: string;
  slug: string;
  brand: string | null;
  model: string | null;
  sku: string | null;
  shortDescription: string | null;
  description: string | null;
  price: string;
  oldPrice: string | null;
  images: string[];
  stockStatus: string;
  stockQuantity: number;
  isUsed: boolean;
  condition: string | null;
  manufactureYear: number | null;
  specifications: Record<string, string>;
  metaTitle: string | null;
  metaDescription: string | null;
}

const STOCK_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  in_stock:     { label: 'В наличии',    color: 'text-green-700 bg-green-50 border-green-200',   icon: CheckCircle },
  low_stock:    { label: 'Заканчивается', color: 'text-orange-700 bg-orange-50 border-orange-200', icon: AlertCircle },
  out_of_stock: { label: 'Нет в наличии', color: 'text-red-700 bg-red-50 border-red-200',          icon: AlertCircle },
  pre_order:    { label: 'Под заказ',    color: 'text-blue-700 bg-blue-50 border-blue-200',        icon: AlertCircle },
};

const CONDITION_MAP: Record<string, string> = {
  new:           'Новое',
  excellent:     'Отличное',
  good:          'Хорошее',
  fair:          'Удовлетворительное',
  used:          'Б/У',
  poor:          'Плохое',
  needs_repair:  'Требует ремонта',
  in_stock:      'В наличии',
  out_of_stock:  'Нет в наличии',
  preorder:      'Под заказ',
  pre_order:     'Под заказ',
};

function localizeCondition(v: string | null | undefined): string {
  if (!v) return '';
  return CONDITION_MAP[v.toLowerCase().replace(/[-\s]/g, '_')] || v;
}

export default function SaleProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const [activeImage, setActiveImage] = useState(0);

  const { data: product, isLoading, isError } = useQuery<SaleProduct>({
    queryKey: ['sale-product', slug],
    queryFn: () => api.get(`/sales/products/${slug}`),
    enabled: !!slug,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-pulse">
          <div className="aspect-square bg-gray-100 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-100 rounded w-3/4" />
            <div className="h-10 bg-gray-100 rounded w-1/2" />
            <div className="h-20 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Товар не найден</h2>
        <p className="text-gray-500 mb-6">Возможно, товар был снят с продажи</p>
        <Link href="/sale" className="inline-flex items-center gap-2 text-blue-600 hover:underline">
          <ChevronLeft className="w-4 h-4" />
          Все товары для продажи
        </Link>
      </div>
    );
  }

  const price = parseFloat(product.price) || 0;
  const oldPrice = product.oldPrice ? parseFloat(product.oldPrice) : null;
  const discount = oldPrice ? Math.round((1 - price / oldPrice) * 100) : null;
  const stock = STOCK_LABELS[product.stockStatus] || { label: product.stockStatus, color: 'text-gray-600 bg-gray-50 border-gray-200', icon: Package };
  const StockIcon = stock.icon;
  const images = product.images || [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {product.metaTitle && <title>{product.metaTitle}</title>}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link href="/" className="hover:text-blue-600 transition-colors">Главная</Link>
        <span>/</span>
        <Link href="/sale" className="hover:text-blue-600 transition-colors">Продажа</Link>
        <span>/</span>
        <span className="text-gray-900">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Images */}
        <div>
          <div className="aspect-square bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl overflow-hidden mb-3 flex items-center justify-center">
            {images.length > 0 ? (
              <img src={images[activeImage]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <Package className="w-24 h-24 text-gray-300" />
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActiveImage(i)}
                  className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    activeImage === i ? 'border-blue-600' : 'border-gray-200 hover:border-blue-300'
                  }`}>
                  <img src={img} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {(product.brand || product.isUsed) && (
            <div className="flex items-center gap-2 mb-2">
              {product.brand && <span className="text-blue-600 font-medium text-sm">{product.brand}</span>}
              {product.isUsed && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200">Б/У</span>
              )}
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-extrabold text-gray-900">{price.toLocaleString('ru-RU')} ₽</span>
            {oldPrice && (
              <>
                <span className="text-lg text-gray-400 line-through">{oldPrice.toLocaleString('ru-RU')} ₽</span>
                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-sm font-bold rounded-full">-{discount}%</span>
              </>
            )}
          </div>

          {/* Stock status */}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border mb-5 ${stock.color}`}>
            <StockIcon className="w-4 h-4" />
            {stock.label}
            {product.stockStatus === 'in_stock' && product.stockQuantity > 0 && product.stockQuantity <= 5 && (
              <span className="ml-1">· осталось {product.stockQuantity} шт.</span>
            )}
          </div>

          {/* Used condition */}
          {product.isUsed && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
              <p className="text-sm font-semibold text-amber-900 mb-1">Информация о б/у товаре</p>
              {product.condition && (
                <p className="text-sm text-amber-800">
                  Состояние: <strong>{localizeCondition(product.condition)}</strong>
                </p>
              )}
              {product.manufactureYear && (
                <p className="text-sm text-amber-800">Год выпуска: {product.manufactureYear}</p>
              )}
            </div>
          )}

          {product.shortDescription && (
            <p className="text-gray-600 mb-5 leading-relaxed">{product.shortDescription}</p>
          )}

          {/* Actions — покупка, не аренда */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <Link href="/info/contacts"
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
              <Phone className="w-4 h-4" />
              {product.stockStatus === 'out_of_stock' ? 'Узнать о поступлении' : 'Купить / Узнать цену'}
            </Link>
            <Link href="/info/contacts"
              className="flex-1 flex items-center justify-center gap-2 py-3.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-colors">
              <MessageSquare className="w-4 h-4" />
              Связаться с менеджером
            </Link>
          </div>

          {/* Meta */}
          {(product.sku || product.model) && (
            <div className="text-xs text-gray-400 space-y-1 mb-4">
              {product.sku && <div>Артикул: {product.sku}</div>}
              {product.model && <div>Модель: {product.model}</div>}
            </div>
          )}

          {/* Delivery note */}
          <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 border border-gray-100">
            <ShoppingBag className="w-3.5 h-3.5 inline mr-1" />
            Продажа снаряжения — для покупки свяжитесь с менеджером или приезжайте в шоурум.
          </div>
        </div>
      </div>

      {/* Description + Specs */}
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {product.description && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Описание</h2>
            <div className="prose prose-gray max-w-none">
              {product.description.split('\n').map((line, i) => (
                <p key={i} className="text-gray-700 mb-2 leading-relaxed">{line}</p>
              ))}
            </div>
          </div>
        )}

        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Характеристики</h2>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {Object.entries(product.specifications).map(([key, value], i) => (
                <div key={key} className={`flex justify-between px-5 py-3 text-sm ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                  <span className="text-gray-500 font-medium">{key}</span>
                  <span className="text-gray-900 font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="mt-12 bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-8 text-white">
        <h3 className="text-xl font-bold mb-2">Хотите купить это снаряжение?</h3>
        <p className="text-gray-300 mb-4">Свяжитесь с нами — расскажем о наличии, доставке и способах оплаты</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/info/contacts"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-colors">
            <Phone className="w-4 h-4" />
            Контакты
          </Link>
          <Link href="/catalog"
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors">
            Смотреть аренду
          </Link>
        </div>
      </div>
    </div>
  );
}
