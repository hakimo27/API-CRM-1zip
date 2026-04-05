import { useState } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSaleCart } from '@/contexts/SaleCartContext';
import { Search, Tag, Package, ShoppingCart, Check } from 'lucide-react';

interface SaleProduct {
  id: number;
  name: string;
  slug: string;
  brand: string | null;
  shortDescription: string | null;
  price: string;
  oldPrice: string | null;
  images: string[];
  stockStatus: string;
  stockQuantity: number;
  isUsed: boolean;
  condition: string | null;
  categoryId: number | null;
  featured: boolean;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

const STOCK_LABELS: Record<string, { label: string; color: string }> = {
  in_stock: { label: 'В наличии', color: 'text-green-600 bg-green-50' },
  low_stock: { label: 'Заканчивается', color: 'text-orange-600 bg-orange-50' },
  out_of_stock: { label: 'Нет в наличии', color: 'text-red-600 bg-red-50' },
  pre_order: { label: 'Под заказ', color: 'text-blue-600 bg-blue-50' },
};

function ProductCard({ product }: { product: SaleProduct }) {
  const price = parseFloat(product.price) || 0;
  const oldPrice = product.oldPrice ? parseFloat(product.oldPrice) : null;
  const discount = oldPrice ? Math.round((1 - price / oldPrice) * 100) : null;
  const stock = STOCK_LABELS[product.stockStatus] || { label: product.stockStatus, color: 'text-gray-600 bg-gray-50' };
  const mainImage = product.images?.[0];
  const canBuy = product.stockStatus !== 'out_of_stock';
  const { addItem, items } = useSaleCart();
  const [added, setAdded] = useState(false);
  const inCart = items.some(i => i.productId === product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: mainImage || null,
      price,
      oldPrice,
      quantity: 1,
      maxQuantity: product.stockQuantity || 99,
      stockStatus: product.stockStatus,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-100 overflow-hidden group flex flex-col">
      <Link href={`/sale/${product.slug}`} className="flex-1">
        <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center overflow-hidden">
          {mainImage ? (
            <img src={mainImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <Package className="w-16 h-16 text-gray-300" />
          )}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {discount && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                -{discount}%
              </span>
            )}
            {product.isUsed && (
              <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full">
                Б/У
              </span>
            )}
            {product.featured && !product.isUsed && (
              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                Хит
              </span>
            )}
          </div>
        </div>

        <div className="p-4">
          {product.brand && (
            <div className="text-xs text-blue-600 font-medium mb-1">{product.brand}</div>
          )}
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-700 transition-colors">
            {product.name}
          </h3>
          {product.shortDescription && (
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">{product.shortDescription}</p>
          )}

          <div className="flex items-center justify-between mb-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-gray-900">{price.toLocaleString('ru-RU')} ₽</span>
              {oldPrice && (
                <span className="text-sm text-gray-400 line-through">{oldPrice.toLocaleString('ru-RU')} ₽</span>
              )}
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${stock.color}`}>
              {stock.label}
            </span>
          </div>
        </div>
      </Link>

      <div className="px-4 pb-4">
        {canBuy ? (
          <button onClick={handleAddToCart}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              added || inCart
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}>
            {added ? <><Check className="w-4 h-4" /> Добавлено</> : inCart ? <><Check className="w-4 h-4" /> В корзине</> : <><ShoppingCart className="w-4 h-4" /> В корзину</>}
          </button>
        ) : (
          <Link href={`/sale/${product.slug}`}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-500 cursor-default">
            Нет в наличии
          </Link>
        )}
      </div>
    </div>
  );
}

export default function SaleCatalogPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [showUsed, setShowUsed] = useState<boolean | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'price_asc' | 'price_desc' | 'featured'>('featured');

  const { data: products = [], isLoading } = useQuery<SaleProduct[]>({
    queryKey: ['sale-products'],
    queryFn: () => api.get('/sales/products'),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories'),
  });

  const filtered = products
    .filter(p => {
      const s = search.toLowerCase();
      if (s && !p.name.toLowerCase().includes(s) && !(p.brand || '').toLowerCase().includes(s)) return false;
      if (selectedCategory !== null && p.categoryId !== selectedCategory) return false;
      if (showUsed === true && !p.isUsed) return false;
      if (showUsed === false && p.isUsed) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return parseFloat(a.price) - parseFloat(b.price);
      if (sortBy === 'price_desc') return parseFloat(b.price) - parseFloat(a.price);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    });

  const usedCount = products.filter(p => p.isUsed).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Продажа снаряжения</h1>
        <p className="text-gray-500">
          Новое и б/у снаряжение для водного туризма — байдарки, каноэ, SUP, экипировка
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="lg:w-64 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Condition */}
            {usedCount > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Состояние</p>
                <div className="space-y-1.5">
                  {[
                    { value: null, label: 'Всё снаряжение' },
                    { value: false, label: 'Новое' },
                    { value: true, label: `Б/У (${usedCount})` },
                  ].map(opt => (
                    <button
                      key={String(opt.value)}
                      onClick={() => setShowUsed(opt.value)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        showUsed === opt.value
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Categories */}
            {categories.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Категория</p>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      selectedCategory === null ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Все категории
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        selectedCategory === cat.id ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1">
          {/* Sort + count */}
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-gray-500">
              {isLoading ? 'Загрузка...' : `${filtered.length} товаров`}
            </p>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="featured">Популярные</option>
              <option value="price_asc">Цена: по возрастанию</option>
              <option value="price_desc">Цена: по убыванию</option>
              <option value="name">По названию</option>
            </select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                  <div className="aspect-square bg-gray-100" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-6 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Tag className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Товаров не найдено</h3>
              <p className="text-gray-400 mb-4">Попробуйте изменить параметры фильтра</p>
              <button
                onClick={() => { setSearch(''); setSelectedCategory(null); setShowUsed(null); }}
                className="text-blue-600 hover:underline text-sm"
              >
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
