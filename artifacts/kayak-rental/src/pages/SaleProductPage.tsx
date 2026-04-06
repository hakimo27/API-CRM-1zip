import { useState } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSaleCart } from '@/contexts/SaleCartContext';
import { RichContent } from '@/components/RichContent';
import { useSeoMeta } from '@/hooks/useSeoMeta';
import {
  ChevronLeft, Package, CheckCircle, ShoppingBag, AlertCircle,
  ShoppingCart, Zap, Minus, Plus, Check,
} from 'lucide-react';

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
  specifications: Array<{ label: string; value: string; unit: string; sortOrder: number }> | Record<string, string> | null;
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
  const [qty, setQty] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const { addItem, items } = useSaleCart();
  const [, navigate] = useLocation();

  const { data: product, isLoading, isError } = useQuery<SaleProduct>({
    queryKey: ['sale-product', slug],
    queryFn: () => api.get(`/sales/products/${slug}`),
    enabled: !!slug,
    retry: false,
  });

  useSeoMeta({
    title: product?.metaTitle || product?.name,
    description: product?.metaDescription || (product?.description ? product.description.replace(/<[^>]*>/g, '').slice(0, 160).trim() : undefined),
    image: (product as any)?.images?.[0]?.url || undefined,
    type: 'product',
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
  const maxQty = product.stockQuantity > 0 ? product.stockQuantity : 99;
  const canBuy = product.stockStatus !== 'out_of_stock';
  const inCart = items.some(i => i.productId === product.id);

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: images[0] || null,
      price,
      oldPrice,
      quantity: qty,
      maxQuantity: maxQty,
      stockStatus: product.stockStatus,
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  const handleBuyNow = () => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: images[0] || null,
      price,
      oldPrice,
      quantity: qty,
      maxQuantity: maxQty,
      stockStatus: product.stockStatus,
    });
    navigate('/sale/checkout');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {product.metaTitle && <title>{product.metaTitle}</title>}

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

          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-extrabold text-gray-900">{price.toLocaleString('ru-RU')} ₽</span>
            {oldPrice && (
              <>
                <span className="text-lg text-gray-400 line-through">{oldPrice.toLocaleString('ru-RU')} ₽</span>
                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-sm font-bold rounded-full">-{discount}%</span>
              </>
            )}
          </div>

          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border mb-5 ${stock.color}`}>
            <StockIcon className="w-4 h-4" />
            {stock.label}
            {product.stockStatus === 'in_stock' && product.stockQuantity > 0 && product.stockQuantity <= 5 && (
              <span className="ml-1">· осталось {product.stockQuantity} шт.</span>
            )}
          </div>

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

          {/* Quantity selector */}
          {canBuy && (
            <div className="flex items-center gap-4 mb-5">
              <span className="text-sm font-medium text-gray-700">Количество:</span>
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1">
                <button onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all text-gray-600">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center font-semibold text-gray-900">{qty}</span>
                <button onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                  disabled={qty >= maxQty}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all text-gray-600 disabled:opacity-40">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-sm font-bold text-gray-900">= {(price * qty).toLocaleString('ru-RU')} ₽</span>
            </div>
          )}

          {/* Action buttons */}
          {canBuy ? (
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <button onClick={handleBuyNow}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
                <Zap className="w-4 h-4" />
                Купить сейчас
              </button>
              <button onClick={handleAddToCart}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 border-2 font-semibold rounded-xl transition-all ${
                  addedToCart
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                }`}>
                {addedToCart ? <><Check className="w-4 h-4" /> Добавлено!</> : <><ShoppingCart className="w-4 h-4" /> В корзину</>}
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <Link href="/info/contacts"
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
                Узнать о поступлении
              </Link>
            </div>
          )}

          {inCart && !addedToCart && (
            <div className="mb-4 flex items-center justify-between px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm">
              <span className="text-blue-700 font-medium">Товар уже в корзине</span>
              <Link href="/sale/cart" className="text-blue-600 font-semibold hover:underline">Перейти →</Link>
            </div>
          )}

          {(product.sku || product.model) && (
            <div className="text-xs text-gray-400 space-y-1 mb-4">
              {product.sku && <div>Артикул: {product.sku}</div>}
              {product.model && <div>Модель: {product.model}</div>}
            </div>
          )}

          <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 border border-gray-100">
            <ShoppingBag className="w-3.5 h-3.5 inline mr-1" />
            Самовывоз и доставка по Москве. Оплата при получении или переводом.
          </div>
        </div>
      </div>

      {/* Description + Specs */}
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {product.description && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Описание</h2>
            <RichContent html={product.description} />
          </div>
        )}

        {(() => {
          const specs = product.specifications;
          if (!specs) return null;
          // New array format
          if (Array.isArray(specs) && specs.length > 0) {
            const sorted = [...specs].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
            return (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Характеристики</h2>
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  {sorted.map((s, i) => (
                    <div key={i} className={`flex items-center justify-between px-5 py-3 text-sm ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${i < sorted.length - 1 ? 'border-b border-gray-100' : ''}`}>
                      <span className="text-gray-500">{s.label}</span>
                      <span className="font-semibold text-gray-900">{s.value}{s.unit ? <span className="font-normal text-gray-400 ml-1">{s.unit}</span> : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          // Legacy object format
          if (!Array.isArray(specs) && Object.keys(specs).length > 0) {
            return (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Характеристики</h2>
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  {Object.entries(specs).map(([key, value], i, arr) => (
                    <div key={key} className={`flex justify-between px-5 py-3 text-sm ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                      <span className="text-gray-500">{key}</span>
                      <span className="text-gray-900 font-semibold">{value as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          return null;
        })()}
      </div>

      {/* Bottom upsell */}
      <div className="mt-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold mb-1">Нужна аренда вместо покупки?</h3>
          <p className="text-blue-100 text-sm">Байдарки, каноэ и SUP-доски в аренду от 1 дня</p>
        </div>
        <Link href="/catalog"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors whitespace-nowrap">
          Смотреть аренду
        </Link>
      </div>
    </div>
  );
}
