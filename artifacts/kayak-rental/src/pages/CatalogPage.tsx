import { useState } from "react";
import { Link, useSearch } from "wouter";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useListProducts, useListCategories } from "@workspace/api-client-react";

function ProductCard({ product }: { product: any }) {
  const minPrice = product.tariffs?.length > 0
    ? Math.min(...product.tariffs.map((t: any) => t.pricePerDay))
    : null;

  return (
    <Link href={`/catalog/${product.slug}`}>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group cursor-pointer">
        <div className="relative h-52 bg-gradient-to-br from-blue-50 to-slate-100 overflow-hidden">
          {product.mainImage ? (
            <img
              src={product.mainImage}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-7xl">🛶</div>
          )}
          {product.badge && (
            <span className="absolute top-3 left-3 bg-blue-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              {product.badge}
            </span>
          )}
        </div>
        <div className="p-4">
          <div className="text-xs text-blue-600 font-medium mb-1">{product.categoryName}</div>
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug text-sm">
            {product.name}
          </h3>
          {product.shortDescription && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
              {product.shortDescription}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {product.capacity && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {product.capacity} мест
              </span>
            )}
            {product.constructionType && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {product.constructionType}
              </span>
            )}
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              {minPrice ? (
                <div className="text-sm font-bold text-gray-900">
                  от {minPrice.toLocaleString("ru-RU")} ₽/день
                </div>
              ) : (
                <div className="text-sm text-gray-500">Цена по запросу</div>
              )}
              {product.depositAmount && (
                <div className="text-xs text-gray-400">
                  залог {product.depositAmount.toLocaleString("ru-RU")} ₽
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function CatalogPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialCategory = params.get("category") ?? undefined;

  const [category, setCategory] = useState<string | undefined>(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const [capacity, setCapacity] = useState<string | undefined>();

  const { data: products, isLoading } = useListProducts({
    category,
    capacity,
  });

  const { data: categories } = useListCategories();

  const filtered = products?.filter((p) =>
    searchQuery
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.shortDescription ?? "").toLowerCase().includes(searchQuery.toLowerCase())
      : true,
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Каталог снаряжения</h1>
        <p className="text-gray-500">Байдарки, SUP-борды и туристическое снаряжение для аренды</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar filters */}
        <aside className="lg:w-56 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-6">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-3 block">Категория</label>
              <div className="space-y-2">
                <button
                  onClick={() => setCategory(undefined)}
                  className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                    !category ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Все категории
                </button>
                {categories?.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.slug)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                      category === cat.slug
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className="text-xs text-gray-400">{cat.productCount}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-3 block">Вместимость</label>
              <div className="space-y-2">
                {[
                  { label: "Все", value: undefined },
                  { label: "1 место", value: "1" },
                  { label: "2 места", value: "2" },
                  { label: "3 места", value: "3" },
                  { label: "4 места", value: "4" },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setCapacity(opt.value)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                      capacity === opt.value
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {(category || capacity) && (
              <button
                onClick={() => { setCategory(undefined); setCapacity(undefined); }}
                className="w-full text-sm text-red-600 hover:text-red-700 flex items-center gap-2 py-1"
              >
                <X className="w-3.5 h-3.5" />
                Сбросить фильтры
              </button>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="mb-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск снаряжения..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 h-80 animate-pulse" />
              ))}
            </div>
          ) : filtered && filtered.length > 0 ? (
            <>
              <div className="text-sm text-gray-500 mb-4">{filtered.length} товаров</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <div className="font-semibold text-gray-900 mb-2">Ничего не найдено</div>
              <div className="text-gray-500 text-sm">
                Попробуйте изменить фильтры или поисковый запрос
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
