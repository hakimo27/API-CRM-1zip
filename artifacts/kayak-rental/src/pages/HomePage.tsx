import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowRight, Shield, Clock, MapPin, Star, ChevronRight, Anchor, Waves, Users, Mountain } from 'lucide-react';

interface Product {
  id: number; name: string; slug: string; categoryName: string;
  shortDescription: string | null; capacity: number | null;
  depositAmount: number | null; featured: boolean; badge: string | null;
  mainImage: string | null;
  tariffs: Array<{ id: number; type: string; label: string; pricePerDay: number }>;
}

interface Category {
  id: number; name: string; slug: string; productCount: number;
}


function ProductCard({ product }: { product: Product }) {
  const minPrice = product.tariffs?.length
    ? Math.min(...product.tariffs.map(t => t.pricePerDay))
    : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden group">
      <div className="relative h-48 bg-gradient-to-br from-blue-100 to-cyan-50 flex items-center justify-center overflow-hidden">
        {product.mainImage ? (
          <img src={product.mainImage} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <Waves className="w-16 h-16 text-blue-300" />
        )}
        {product.badge && (
          <span className="absolute top-3 left-3 px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
            {product.badge}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="text-xs text-blue-600 font-medium mb-1">{product.categoryName}</div>
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-700 transition-colors">
          {product.name}
        </h3>
        {product.shortDescription && (
          <p className="text-sm text-gray-500 mb-3 line-clamp-2">{product.shortDescription}</p>
        )}
        <div className="flex items-center justify-between">
          {minPrice ? (
            <div>
              <span className="text-xs text-gray-500">от </span>
              <span className="text-lg font-bold text-blue-700">{minPrice.toLocaleString('ru-RU')} ₽</span>
              <span className="text-xs text-gray-500">/день</span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">Цена по запросу</span>
          )}
          <Link href={`/catalog/${product.slug}`}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Выбрать
          </Link>
        </div>
      </div>
    </div>
  );
}

function TourCard({ tour }: { tour: any }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden group">
      <div className="h-44 bg-gradient-to-br from-teal-100 to-green-50 flex items-center justify-center relative overflow-hidden">
        {tour.mainImage ? (
          <img src={tour.mainImage} alt={tour.title || tour.name} className="w-full h-full object-cover" />
        ) : (
          <Mountain className="w-14 h-14 text-teal-300" />
        )}
        {tour.difficulty && (
          <span className="absolute top-3 right-3 px-2 py-1 bg-white/80 backdrop-blur text-xs font-medium rounded-full text-gray-700">
            {tour.difficulty === 'easy' ? 'Лёгкий' : tour.difficulty === 'medium' ? 'Средний' : tour.difficulty === 'hard' ? 'Сложный' : tour.difficulty}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1.5 group-hover:text-blue-700 transition-colors line-clamp-1">
          {tour.name || tour.title}
        </h3>
        {tour.shortDescription && (
          <p className="text-sm text-gray-500 mb-3 line-clamp-2">{tour.shortDescription}</p>
        )}
        <div className="flex flex-wrap gap-3 mb-3 text-xs text-gray-500">
          {(tour.duration || tour.durationDays) && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {tour.duration || `${tour.durationDays} дн.`}
            </span>
          )}
          {(tour.maxParticipants || tour.groupSize) && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> до {tour.maxParticipants || tour.groupSize} чел.
            </span>
          )}
          {(tour.location || tour.region) && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {tour.location || tour.region}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          {(tour.price || tour.basePrice) ? (
            <div>
              <span className="text-xs text-gray-500">от </span>
              <span className="font-bold text-blue-700 text-sm">
                {Number(tour.price || tour.basePrice).toLocaleString('ru-RU')} ₽
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">Цена по запросу</span>
          )}
          <Link href={`/tours/${tour.slug}`}
            className="px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 transition-colors">
            Подробнее
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products', 'featured'],
    queryFn: () => api.get('/products?featured=true&limit=6'),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories'),
  });

  const { data: reviews = [] } = useQuery<any[]>({
    queryKey: ['reviews'],
    queryFn: () => api.get('/content/reviews'),
  });

  const { data: tours = [] } = useQuery<any[]>({
    queryKey: ['tours-public'],
    queryFn: () => api.get('/tours?active=true&limit=6'),
  });

  const featuredTours = tours.filter((t: any) => t.featured || t.active !== false).slice(0, 3);

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-700 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-1.5 rounded-full text-sm font-medium mb-6">
              <Anchor className="w-4 h-4" />
              <span>Аренда водного снаряжения в Москве</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Откройте мир<br />
              <span className="text-cyan-300">водных приключений</span>
            </h1>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Байдарки, каноэ и SUP-доски напрокат. Более 100 единиц снаряжения, доставка по Москве и Подмосковью.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/catalog" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-800 font-bold rounded-xl hover:bg-blue-50 transition-colors text-lg">
                Выбрать снаряжение
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/tours" className="inline-flex items-center gap-2 px-8 py-4 bg-white/20 backdrop-blur text-white font-bold rounded-xl hover:bg-white/30 transition-colors text-lg border border-white/30">
                Туры и маршруты
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-50 to-transparent" />
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: 'Надёжное снаряжение', desc: 'Всё оборудование регулярно проходит техническое обслуживание и проверку' },
              { icon: Clock, title: 'Гибкие сроки аренды', desc: 'Аренда от 1 дня. Специальные цены на недельную аренду' },
              { icon: MapPin, title: 'Доставка по региону', desc: 'Привезём снаряжение до места старта маршрута в Москве и области' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 p-6 rounded-2xl bg-blue-50">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                  <p className="text-sm text-gray-600">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Категории снаряжения</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {categories.map(cat => (
                <Link key={cat.id} href={`/catalog?category=${cat.slug}`}
                  className="flex flex-col items-center justify-center gap-2 p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1 border border-gray-100 group text-center">
                  <span className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{cat.name}</span>
                  <span className="text-xs text-gray-400">{cat.productCount ?? 0} товаров</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      {products.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Популярные позиции</h2>
              <Link href="/catalog" className="inline-flex items-center gap-1 text-blue-600 font-medium hover:text-blue-700 transition-colors">
                Весь каталог <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.slice(0, 6).map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* Tours block */}
      {tours.length > 0 && (
        <section className="py-16 bg-gradient-to-br from-teal-50 to-green-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="inline-flex items-center gap-2 text-teal-600 font-medium text-sm mb-2">
                  <Waves className="w-4 h-4" /> Водные маршруты
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Туры и экспедиции</h2>
                <p className="text-gray-600 mt-1">Готовые маршруты с опытными инструкторами</p>
              </div>
              <Link href="/tours" className="inline-flex items-center gap-1 text-teal-600 font-medium hover:text-teal-700 transition-colors">
                Все туры <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(featuredTours.length > 0 ? featuredTours : tours.slice(0, 3)).map((t: any) => (
                <TourCard key={t.id} tour={t} />
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href="/tours"
                className="inline-flex items-center gap-2 px-8 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors">
                Смотреть все туры <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Отзывы клиентов</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reviews.slice(0, 3).map((r: any) => (
                <div key={r.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex gap-1 mb-3">
                    {[...Array(r.rating || 5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 text-sm mb-4">{r.text?.replace(/<[^>]*>/g, '') || ''}</p>
                  <div className="font-medium text-gray-900 text-sm">{r.authorName}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-blue-800 to-cyan-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Готовы к приключениям?</h2>
          <p className="text-xl text-blue-100 mb-8">Забронируйте снаряжение онлайн за 5 минут и отправляйтесь в путь</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/catalog" className="inline-flex items-center gap-2 px-10 py-4 bg-white text-blue-800 font-bold rounded-xl hover:bg-blue-50 transition-colors text-lg">
              Выбрать снаряжение
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/tours" className="inline-flex items-center gap-2 px-10 py-4 bg-white/20 text-white font-bold rounded-xl hover:bg-white/30 transition-colors text-lg border border-white/30">
              Посмотреть туры
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
