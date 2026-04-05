import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Calendar, Users, MapPin, Clock, Mountain } from 'lucide-react';
import { Link } from 'wouter';

const DIFFICULTY_LABEL: Record<string, { label: string; cls: string }> = {
  easy:    { label: 'Лёгкий',        cls: 'bg-green-100 text-green-700' },
  medium:  { label: 'Средний',       cls: 'bg-blue-100 text-blue-700' },
  hard:    { label: 'Сложный',       cls: 'bg-orange-100 text-orange-700' },
  extreme: { label: 'Экстремальный', cls: 'bg-red-100 text-red-700' },
};

const TYPE_LABEL: Record<string, string> = {
  rafting:    'Рафтинг',
  kayak_tour: 'Байдарочный тур',
  instruction:'Инструктаж',
  excursion:  'Экскурсия',
};

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
          {tours.map((tour: any) => {
            const diff = tour.difficulty ? DIFFICULTY_LABEL[tour.difficulty] : null;
            return (
              <div key={tour.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                {/* Image or placeholder */}
                <div className="h-48 bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center relative overflow-hidden">
                  {tour.mainImage ? (
                    <img src={tour.mainImage} alt={tour.title} className="w-full h-full object-cover absolute inset-0" />
                  ) : (
                    <span className="text-7xl opacity-30">🚣</span>
                  )}
                  <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                    {tour.type && (
                      <span className="px-2 py-0.5 bg-white/85 backdrop-blur text-xs font-medium rounded-full text-gray-700">
                        {TYPE_LABEL[tour.type] ?? tour.type}
                      </span>
                    )}
                    {diff && (
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${diff.cls}`}>
                        {diff.label}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1.5 group-hover:text-blue-700 transition-colors">
                    {tour.title}
                  </h3>
                  {tour.description && (
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{tour.description}</p>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-xs text-gray-500">
                    {tour.duration && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {tour.duration} {tour.duration === 1 ? 'день' : tour.duration < 5 ? 'дня' : 'дней'}
                      </div>
                    )}
                    {tour.maxParticipants && (
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        до {tour.maxParticipants} чел.
                      </div>
                    )}
                    {tour.region && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {tour.region}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    {tour.basePrice && Number(tour.basePrice) > 0 ? (
                      <div>
                        <span className="text-xs text-gray-400">от </span>
                        <span className="font-bold text-blue-700">{Number(tour.basePrice).toLocaleString('ru-RU')} ₽</span>
                        <span className="text-xs text-gray-400"> / чел.</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Цена по запросу</span>
                    )}
                    <Link href={`/tours/${tour.slug}`}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
                      Подробнее
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
