import { useState } from 'react';
import { Link, useSearch } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, X, Star } from 'lucide-react';
import { api } from '@/lib/api';

interface ProductImage { id: number; url: string; alt: string | null; }
interface Product {
  id: number; name: string; slug: string; categoryName: string;
  shortDescription: string | null; capacity: number | null;
  featured: boolean; badge: string | null;
  images: ProductImage[];
  tariffs: Array<{ id: number; type: string; label: string; pricePerDay: number }>;
}

interface Category {
  id: number; name: string; slug: string;
}

export default function CatalogPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(params.get('category') || '');
  const [showFilters, setShowFilters] = useState(false);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products', selectedCategory, searchText],
    queryFn: () => {
      const q = new URLSearchParams();
      if (selectedCategory) q.set('categorySlug', selectedCategory);
      if (searchText) q.set('search', searchText);
      return api.get(`/products?${q}`);
    },
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories'),
  });

  const filtered = searchText
    ? products.filter(p => p.name.toLowerCase().includes(searchText.toLowerCase()))
    : products;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Каталог снаряжения</h1>
        <p className="text-gray-600">Аренда байдарок, каноэ и SUP-досок в Москве и Подмосковье</p>
      </div>

      {/* Search + Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Поиск снаряжения..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Фильтры
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            !selectedCategory ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Все
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.slug)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === cat.slug ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 h-72 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Ничего не найдено</h3>
          <p className="text-gray-500">Попробуйте изменить параметры поиска</p>
          {selectedCategory && (
            <button onClick={() => setSelectedCategory('')} className="mt-4 text-blue-600 hover:underline">
              Показать все товары
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">{filtered.length} товаров</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(product => {
              const minPrice = product.tariffs?.length
                ? Math.min(...product.tariffs.map(t => t.pricePerDay))
                : null;
              return (
                <div key={product.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-100 overflow-hidden group">
                  <div className="relative h-44 bg-gradient-to-br from-blue-100 to-cyan-50 flex items-center justify-center overflow-hidden">
                    {product.badge && (
                      <span className="absolute top-3 left-3 z-10 px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                        {product.badge}
                      </span>
                    )}
                    {product.images?.[0]?.url ? (
                      <img
                        src={product.images[0].url}
                        alt={product.images[0].alt || product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <span className="text-6xl opacity-40">🛶</span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-blue-600 font-medium mb-1">{product.categoryName}</div>
                    <Link href={`/catalog/${product.slug}`}>
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-700 transition-colors cursor-pointer">
                        {product.name}
                      </h3>
                    </Link>
                    {product.shortDescription && (
                      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{product.shortDescription}</p>
                    )}
                    <div className="flex items-center justify-between">
                      {minPrice ? (
                        <div>
                          <span className="text-xs text-gray-500">от </span>
                          <span className="font-bold text-blue-700">{minPrice.toLocaleString('ru-RU')} ₽</span>
                          <span className="text-xs text-gray-500">/день</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">По запросу</span>
                      )}
                      <Link href={`/catalog/${product.slug}`}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
                        Подробнее
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
