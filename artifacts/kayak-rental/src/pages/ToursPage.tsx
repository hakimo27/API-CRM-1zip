import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Calendar, Users, MapPin, Clock } from 'lucide-react';
import { Link } from 'wouter';

export default function ToursPage() {
  const { data: tours = [], isLoading } = useQuery<any[]>({
    queryKey: ['tours'],
    queryFn: () => api.get('/tours'),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Туры и маршруты</h1>
        <p className="text-gray-600">Готовые маршруты для водных путешествий по Подмосковью</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 h-72 animate-pulse" />
          ))}
        </div>
      ) : tours.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🗺️</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Туры скоро появятся</h3>
          <p className="text-gray-500">Мы работаем над добавлением маршрутов</p>
          <Link href="/catalog" className="inline-block mt-4 text-blue-600 hover:underline">Пока выбрать снаряжение</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tours.map((tour: any) => (
            <div key={tour.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
              <div className="h-48 bg-gradient-to-br from-green-100 to-teal-50 flex items-center justify-center relative">
                <span className="text-6xl opacity-60">🚣</span>
                {tour.difficulty && (
                  <span className="absolute top-3 right-3 px-2 py-1 bg-white/80 backdrop-blur text-xs font-medium rounded-full">
                    {tour.difficulty}
                  </span>
                )}
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">{tour.name}</h3>
                {tour.shortDescription && (
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{tour.shortDescription}</p>
                )}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {tour.duration && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Clock className="w-3.5 h-3.5" />
                      {tour.duration}
                    </div>
                  )}
                  {tour.groupSize && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Users className="w-3.5 h-3.5" />
                      До {tour.groupSize} чел.
                    </div>
                  )}
                  {tour.location && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 col-span-2">
                      <MapPin className="w-3.5 h-3.5" />
                      {tour.location}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  {tour.price ? (
                    <div>
                      <span className="text-xs text-gray-500">от </span>
                      <span className="font-bold text-blue-700">{Number(tour.price).toLocaleString('ru-RU')} ₽</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Цена по запросу</span>
                  )}
                  <Link href={`/tours/${tour.slug}`}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                    Подробнее
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
