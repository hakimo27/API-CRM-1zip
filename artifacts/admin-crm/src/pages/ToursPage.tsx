import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Waves, Clock, Users, MapPin, ExternalLink } from 'lucide-react';

export default function ToursPage() {
  const { data: tours = [], isLoading } = useQuery<any[]>({
    queryKey: ['tours'],
    queryFn: () => api.get('/tours'),
  });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Туры и маршруты</h2>
          <span className="text-sm text-gray-400">{tours.length} записей</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tours.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Waves className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Туров пока нет</p>
            <p className="text-xs mt-2">Добавьте первый тур через API</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Длительность</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Группа</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Место</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Цена</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tours.map((tour: any) => (
                  <tr key={tour.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-sm text-gray-900">{tour.name}</div>
                      {tour.difficulty && <div className="text-xs text-gray-400">{tour.difficulty}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {tour.duration ? (
                        <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{tour.duration}</div>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {tour.groupSize ? (
                        <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />до {tour.groupSize}</div>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {tour.location ? (
                        <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{tour.location}</div>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {tour.price ? `${Number(tour.price).toLocaleString('ru-RU')} ₽` : 'По запросу'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        tour.active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {tour.active !== false ? 'Активен' : 'Скрыт'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <a href={`/tours/${tour.slug}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
