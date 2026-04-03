import { Link } from "wouter";
import { ArrowRight, Shield, Truck, Phone, Star, ChevronRight, Waves } from "lucide-react";
import { useListProducts, useListCategories } from "@workspace/api-client-react";
import { useCart } from "@/hooks/useCart";
import { addToCart } from "@/lib/cart";

function ProductCard({ product }: { product: any }) {
  const { addItem } = useCart();
  const minPrice = product.tariffs?.length > 0
    ? Math.min(...product.tariffs.map((t: any) => t.pricePerDay))
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
      <Link href={`/catalog/${product.slug}`}>
        <div className="relative h-48 bg-gradient-to-br from-blue-50 to-slate-100 overflow-hidden cursor-pointer">
          {product.mainImage ? (
            <img
              src={product.mainImage}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">🛶</div>
          )}
          {product.badge && (
            <span className="absolute top-3 left-3 bg-blue-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              {product.badge}
            </span>
          )}
        </div>
      </Link>
      <div className="p-4">
        <div className="text-xs text-blue-600 font-medium mb-1">{product.categoryName}</div>
        <Link href={`/catalog/${product.slug}`}>
          <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer line-clamp-2 leading-snug">
            {product.name}
          </h3>
        </Link>
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
            {minPrice && (
              <div className="text-sm font-semibold text-gray-900">
                от {minPrice.toLocaleString("ru-RU")} ₽/день
              </div>
            )}
            {product.depositAmount && (
              <div className="text-xs text-gray-500">
                залог {product.depositAmount.toLocaleString("ru-RU")} ₽
              </div>
            )}
          </div>
          <Link href={`/catalog/${product.slug}`}>
            <button className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
              Подробнее
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { data: featured } = useListProducts({ featured: "true" });
  const { data: categories } = useListCategories();

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-blue-400 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-cyan-400 blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <Waves className="w-5 h-5 text-cyan-400" />
              <span className="text-cyan-400 text-sm font-medium uppercase tracking-wide">
                Прокат водного снаряжения
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Байдарки, SUP-борды и туристическое снаряжение
            </h1>
            <p className="text-blue-200 text-lg md:text-xl leading-relaxed mb-8 max-w-2xl">
              Широкий выбор байдарок для сплава — от дачных прогулок до многодневных экспедиций. 
              Самовывоз и доставка по всему региону.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/catalog">
                <button className="bg-blue-500 hover:bg-blue-400 text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-colors flex items-center gap-2">
                  Смотреть каталог
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
              <Link href="/pages/faq">
                <button className="bg-white/10 hover:bg-white/20 border border-white/30 text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-colors">
                  Как арендовать?
                </button>
              </Link>
            </div>
            <div className="flex flex-wrap gap-6 mt-10 text-sm text-blue-200">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                Залог возвращается
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-cyan-400" />
                Доставка и самовывоз
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-cyan-400" />
                Помощь в выборе
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section className="bg-gray-50 py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Категории снаряжения</h2>
              <Link href="/catalog">
                <span className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center gap-1 cursor-pointer">
                  Весь каталог <ChevronRight className="w-4 h-4" />
                </span>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <Link key={cat.id} href={`/catalog?category=${cat.slug}`}>
                  <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group">
                    <div className="text-3xl mb-3">
                      {cat.slug.includes("kayak") || cat.slug.includes("kayaking") ? "🛶" :
                       cat.slug.includes("sup") ? "🏄" :
                       cat.slug.includes("tent") ? "⛺" :
                       cat.slug.includes("bag") ? "🎒" :
                       cat.slug.includes("life") ? "🦺" : "🌿"}
                    </div>
                    <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors text-sm leading-tight">
                      {cat.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{cat.productCount} товаров</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured products */}
      {featured && featured.length > 0 && (
        <section className="py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Популярное</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Выбор наших клиентов</h2>
              </div>
              <Link href="/catalog">
                <span className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center gap-1 cursor-pointer">
                  Все товары <ChevronRight className="w-4 h-4" />
                </span>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {featured.slice(0, 8).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="bg-blue-600 text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center mb-10">Как арендовать?</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { n: "1", title: "Выберите снаряжение", desc: "Просмотрите каталог, выберите байдарку или SUP-борд" },
              { n: "2", title: "Оформите заказ", desc: "Укажите даты аренды и способ получения" },
              { n: "3", title: "Подтверждение", desc: "Менеджер свяжется с вами для подтверждения" },
              { n: "4", title: "Получите и наслаждайтесь", desc: "Привезите залог, получите снаряжение и отправляйтесь в поход" },
            ].map((step) => (
              <div key={step.n} className="text-center">
                <div className="w-12 h-12 rounded-full bg-white/20 text-white font-bold text-xl flex items-center justify-center mx-auto mb-3">
                  {step.n}
                </div>
                <div className="font-semibold text-white mb-2">{step.title}</div>
                <div className="text-blue-200 text-sm leading-relaxed">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Advantages */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Почему выбирают нас</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: "🛡️",
                title: "Залог возвращается",
                desc: "Залог берется только на период аренды и возвращается при сдаче снаряжения в исправном состоянии",
              },
              {
                icon: "📦",
                title: "Полная комплектация",
                desc: "Все байдарки комплектуются веслами и насосом (для надувных). Спасжилеты в наличии",
              },
              {
                icon: "💬",
                title: "Консультация",
                desc: "Помогаем подобрать снаряжение под ваш маршрут и опыт. Доступны по телефону и в чате",
              },
            ].map((a) => (
              <div key={a.title} className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="text-3xl mb-4">{a.icon}</div>
                <div className="font-semibold text-gray-900 mb-2">{a.title}</div>
                <div className="text-gray-600 text-sm leading-relaxed">{a.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
