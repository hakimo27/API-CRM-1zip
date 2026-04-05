import { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PhoneInput } from '@/components/PhoneInput';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar, Users, Clock, ChevronLeft, CheckCircle,
  MapPin, AlertCircle, ChevronDown, Loader2, Mountain,
  Star, ArrowRight, Info,
} from 'lucide-react';

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

function seatStatus(seatsTotal: number, seatsBooked: number, status: string) {
  if (status === 'cancelled') return { label: 'Отменено', cls: 'bg-red-50 text-red-600', bookable: false };
  if (status === 'completed') return { label: 'Завершено', cls: 'bg-gray-100 text-gray-500', bookable: false };
  const avail = seatsTotal - seatsBooked;
  if (avail <= 0) return { label: 'Мест нет', cls: 'bg-red-50 text-red-600', bookable: false };
  if (avail <= 3) return { label: `Осталось ${avail} места`, cls: 'bg-orange-50 text-orange-600', bookable: true };
  return { label: `${avail} мест`, cls: 'bg-green-50 text-green-700', bookable: true };
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

export default function TourDetailPage() {
  const [, params] = useRoute('/tours/:slug');
  const slug = params?.slug ?? '';
  const { toast } = useToast();

  const [selectedDateId, setSelectedDateId] = useState<number | null>(null);
  const [participants, setParticipants] = useState(1);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);

  const { data: tour, isLoading, error } = useQuery<any>({
    queryKey: ['tour', slug],
    queryFn: () => api.get(`/tours/${slug}`),
    enabled: !!slug,
  });

  const bookMutation = useMutation({
    mutationFn: (body: any) => api.post(`/tours/${selectedDateId}/book`, body),
    onSuccess: () => {
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (e: any) => {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось оформить бронирование', variant: 'destructive' });
    },
  });

  const upcomingDates: any[] = tour?.upcomingDates ?? [];
  const selectedDate = upcomingDates.find((d: any) => d.id === selectedDateId);
  const availableSeats = selectedDate ? selectedDate.seatsTotal - selectedDate.seatsBooked : 0;
  const price = selectedDate ? Number(selectedDate.price) : Number(tour?.basePrice ?? 0);
  const deposit = selectedDate ? Number(selectedDate.depositAmount ?? 0) : Number(tour?.depositAmount ?? 0);
  const totalAmount = price * participants;

  function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDateId) return;
    bookMutation.mutate({ participantCount: participants, contactName, contactPhone, contactEmail, notes });
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Тур не найден</h2>
        <Link href="/tours" className="text-blue-600 hover:underline">← Вернуться к турам</Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Заявка принята!</h1>
        <p className="text-gray-600 mb-2">
          Тур <strong>{tour.title}</strong> — {selectedDate && fmtDate(selectedDate.startDate)}
        </p>
        <p className="text-gray-500 text-sm mb-8">
          Менеджер свяжется с вами в ближайшее время для подтверждения брони.
        </p>
        <div className="bg-gray-50 rounded-2xl p-5 text-left mb-8 text-sm space-y-2">
          <div className="flex justify-between"><span className="text-gray-500">Участников</span><span className="font-medium">{participants}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Сумма</span><span className="font-medium text-blue-700">{totalAmount.toLocaleString('ru-RU')} ₽</span></div>
          {deposit > 0 && <div className="flex justify-between"><span className="text-gray-500">Депозит</span><span className="font-medium">{deposit.toLocaleString('ru-RU')} ₽</span></div>}
          <div className="flex justify-between"><span className="text-gray-500">Контакт</span><span className="font-medium">{contactName}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Телефон</span><span className="font-medium">{contactPhone}</span></div>
        </div>
        <div className="flex gap-3 justify-center">
          <Link href="/tours" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            Ещё туры
          </Link>
          <Link href="/" className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            На главную
          </Link>
        </div>
      </div>
    );
  }

  const diff = tour.difficulty ? DIFFICULTY_LABEL[tour.difficulty] : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back */}
      <Link href="/tours" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-6">
        <ChevronLeft className="w-4 h-4" /> Все туры
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left column: tour info ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero */}
          <div className="relative rounded-2xl overflow-hidden">
            {tour.mainImage ? (
              <img src={tour.mainImage} alt={tour.title} className="w-full h-72 object-cover" />
            ) : (
              <div className="w-full h-56 bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center">
                <span className="text-8xl opacity-40">🚣</span>
              </div>
            )}
            <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
              {tour.type && (
                <span className="px-3 py-1 bg-white/90 backdrop-blur text-xs font-medium rounded-full text-gray-700">
                  {TYPE_LABEL[tour.type] ?? tour.type}
                </span>
              )}
              {diff && (
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${diff.cls}`}>
                  {diff.label}
                </span>
              )}
              {tour.featured && (
                <span className="px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-medium rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3" /> Хит сезона
                </span>
              )}
            </div>
          </div>

          {/* Title + meta */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">{tour.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              {tour.duration && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {tour.duration} {tour.duration === 1 ? 'день' : tour.duration < 5 ? 'дня' : 'дней'}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {tour.minParticipants}–{tour.maxParticipants} чел.
              </div>
              {tour.region && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {tour.region}
                </div>
              )}
              {diff && (
                <div className="flex items-center gap-1.5">
                  <Mountain className="w-4 h-4" />
                  {diff.label}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {tour.description && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">О туре</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{tour.description}</p>
            </div>
          )}

          {/* Program */}
          {tour.program && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Программа</h2>
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {tour.program}
              </div>
            </div>
          )}

          {/* Includes / Excludes */}
          {((tour.includes?.length > 0) || (tour.excludes?.length > 0)) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tour.includes?.length > 0 && (
                <div className="bg-green-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" /> Включено
                  </h3>
                  <ul className="space-y-1.5">
                    {tour.includes.map((item: string, i: number) => (
                      <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                        <span className="mt-0.5 shrink-0">✓</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {tour.excludes?.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
                    <Info className="w-4 h-4" /> Не включено
                  </h3>
                  <ul className="space-y-1.5">
                    {tour.excludes.map((item: string, i: number) => (
                      <li key={i} className="text-sm text-gray-500 flex items-start gap-2">
                        <span className="mt-0.5 shrink-0">—</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Equipment / Requirements */}
          {tour.equipment && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Снаряжение</h2>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{tour.equipment}</p>
            </div>
          )}
          {tour.requirements && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Требования</h2>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{tour.requirements}</p>
            </div>
          )}

          {/* Gallery */}
          {tour.gallery?.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Фотографии</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {tour.gallery.map((src: string, i: number) => (
                  <img key={i} src={src} alt={`фото ${i + 1}`}
                    className="w-full h-36 object-cover rounded-xl" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column: booking card ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            {/* Price card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="mb-4">
                <span className="text-xs text-gray-400">от </span>
                <span className="text-2xl font-bold text-blue-700">{Number(tour.basePrice).toLocaleString('ru-RU')} ₽</span>
                <span className="text-xs text-gray-400"> / чел.</span>
              </div>
              {tour.depositAmount && Number(tour.depositAmount) > 0 && (
                <div className="text-xs text-gray-500 mb-4">
                  Депозит: {Number(tour.depositAmount).toLocaleString('ru-RU')} ₽
                </div>
              )}

              {/* Available dates */}
              {upcomingDates.length === 0 ? (
                <div className="bg-gray-50 rounded-xl p-4 text-center text-sm text-gray-500">
                  Ближайших дат нет.<br />
                  <span className="text-xs">Свяжитесь с нами для уточнения расписания</span>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Выберите дату</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {upcomingDates.map((d: any) => {
                      const seat = seatStatus(d.seatsTotal, d.seatsBooked, d.status);
                      const isSelected = selectedDateId === d.id;
                      return (
                        <button
                          key={d.id}
                          disabled={!seat.bookable}
                          onClick={() => { setSelectedDateId(d.id); setParticipants(1); }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-400'
                              : seat.bookable
                              ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                              : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-medium text-gray-900 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              {fmtDate(d.startDate)}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${seat.cls}`}>{seat.label}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-400 mt-0.5">
                            <span>по {fmtDate(d.endDate)}</span>
                            <span className="font-medium text-gray-700">{Number(d.price).toLocaleString('ru-RU')} ₽/чел.</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Booking form */}
            {selectedDate && (
              <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Оформить бронирование</h3>
                <form onSubmit={handleBook} className="space-y-3">
                  {/* Participants */}
                  <div>
                    <label className={labelCls}>Количество участников</label>
                    <div className="flex items-center gap-2">
                      <button type="button"
                        onClick={() => setParticipants(Math.max(1, participants - 1))}
                        className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">−</button>
                      <span className="w-10 text-center font-semibold text-gray-900">{participants}</span>
                      <button type="button"
                        onClick={() => setParticipants(Math.min(availableSeats, tour.maxParticipants, participants + 1))}
                        className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">+</button>
                      <span className="text-xs text-gray-400 ml-1">макс. {Math.min(availableSeats, tour.maxParticipants)}</span>
                    </div>
                  </div>

                  {/* Contact name */}
                  <div>
                    <label className={labelCls}>Имя и фамилия *</label>
                    <input
                      className={inputCls}
                      placeholder="Иван Иванов"
                      value={contactName}
                      onChange={e => setContactName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className={labelCls}>Телефон *</label>
                    <PhoneInput
                      value={contactPhone}
                      onChange={setContactPhone}
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className={labelCls}>Email</label>
                    <input
                      type="email"
                      className={inputCls}
                      placeholder="ivan@example.com"
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className={labelCls}>Комментарий</label>
                    <textarea
                      rows={2}
                      className={`${inputCls} resize-none`}
                      placeholder="Пожелания, вопросы..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    />
                  </div>

                  {/* Summary */}
                  <div className="bg-blue-50 rounded-xl p-3 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{participants} чел. × {price.toLocaleString('ru-RU')} ₽</span>
                      <span className="font-bold text-blue-700">{totalAmount.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    {deposit > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Депозит для подтверждения</span>
                        <span className="text-gray-600">{deposit.toLocaleString('ru-RU')} ₽</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!contactName || !contactPhone || bookMutation.isPending}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {bookMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Отправка...</>
                    ) : (
                      <>Забронировать тур <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>

                  <p className="text-xs text-gray-400 text-center">
                    Бронирование без предоплаты. Менеджер свяжется с вами.
                  </p>
                </form>
              </div>
            )}

            {upcomingDates.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <p className="text-sm text-gray-600 mb-3">Хотите узнать о ближайших датах?</p>
                <Link href="/contacts"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                  Связаться с нами <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
