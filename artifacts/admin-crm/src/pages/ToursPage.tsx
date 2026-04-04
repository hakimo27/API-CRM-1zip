import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Waves, Clock, Users, Plus, Pencil, Trash2, X, Calendar, BookOpen, Check } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const TYPES = [
  ['rafting', 'Рафтинг'], ['kayak_tour', 'Байдарочный тур'],
  ['instruction', 'Обучение'], ['excursion', 'Экскурсия'],
];
const DIFFICULTIES = [
  ['easy', 'Лёгкий'], ['medium', 'Средний'], ['hard', 'Сложный'], ['extreme', 'Экстрим'],
];
const DATE_STATUSES = [
  ['planned', 'Запланирована'], ['active', 'Активна'],
  ['completed', 'Завершена'], ['cancelled', 'Отменена'],
];
const BOOKING_STATUSES = [
  ['pending', 'Ожидает'], ['confirmed', 'Подтверждено'],
  ['completed', 'Завершено'], ['cancelled', 'Отменено'],
];

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, col2 }: { label: string; children: React.ReactNode; col2?: boolean }) {
  return (
    <div className={col2 ? 'col-span-2' : ''}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

const emptyTour = {
  title: '', slug: '', type: 'rafting', difficulty: 'medium', region: '',
  duration: 1, minParticipants: 1, maxParticipants: 10,
  basePrice: '', depositAmount: '', description: '', program: '',
  equipment: '', requirements: '', active: true, featured: false,
};

const emptyDate = {
  tourId: 0, startDate: '', endDate: '', seatsTotal: 10,
  price: '', depositAmount: '', status: 'planned', notes: '', instructorId: '',
};

export default function ToursPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'tours' | 'dates' | 'bookings'>('tours');
  const [tourForm, setTourForm] = useState<any>(emptyTour);
  const [dateForm, setDateForm] = useState<any>(emptyDate);
  const [creatingTour, setCreatingTour] = useState(false);
  const [editingTour, setEditingTour] = useState<any>(null);
  const [deletingTourId, setDeletingTourId] = useState<number | null>(null);
  const [creatingDate, setCreatingDate] = useState(false);
  const [editingDate, setEditingDate] = useState<any>(null);
  const [deletingDateId, setDeletingDateId] = useState<number | null>(null);
  const [bookingStatusEdit, setBookingStatusEdit] = useState<{ id: number; status: string } | null>(null);

  const { data: tours = [], isLoading: toursLoading } = useQuery<any[]>({
    queryKey: ['tours-admin'],
    queryFn: () => api.get('/tours/admin'),
  });

  const { data: dates = [], isLoading: datesLoading } = useQuery<any[]>({
    queryKey: ['tour-dates-admin'],
    queryFn: () => api.get('/tours/dates'),
    enabled: tab === 'dates',
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<any[]>({
    queryKey: ['tour-bookings'],
    queryFn: () => api.get('/tours/bookings'),
    enabled: tab === 'bookings',
  });

  const { data: instructors = [] } = useQuery<any[]>({
    queryKey: ['users-instructors'],
    queryFn: () => api.get('/users?role=instructor'),
  });

  const createTourMut = useMutation({
    mutationFn: (data: any) => api.post('/tours', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tours-admin'] }); toast({ title: 'Тур создан' }); setCreatingTour(false); setTourForm(emptyTour); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const updateTourMut = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/tours/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tours-admin'] }); toast({ title: 'Тур обновлён' }); setEditingTour(null); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const deleteTourMut = useMutation({
    mutationFn: (id: number) => api.delete(`/tours/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tours-admin'] }); toast({ title: 'Тур удалён' }); setDeletingTourId(null); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const createDateMut = useMutation({
    mutationFn: ({ tourId, data }: any) => api.post(`/tours/${tourId}/dates`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tour-dates-admin'] }); toast({ title: 'Дата добавлена' }); setCreatingDate(false); setDateForm(emptyDate); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const updateDateMut = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/tours/dates/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tour-dates-admin'] }); toast({ title: 'Дата обновлена' }); setEditingDate(null); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const deleteDateMut = useMutation({
    mutationFn: (id: number) => api.delete(`/tours/dates/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tour-dates-admin'] }); toast({ title: 'Дата удалена' }); setDeletingDateId(null); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const updateBookingMut = useMutation({
    mutationFn: ({ id, status }: any) => api.patch(`/tours/bookings/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tour-bookings'] }); toast({ title: 'Статус обновлён' }); setBookingStatusEdit(null); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const openEditTour = (t: any) => {
    setTourForm({
      title: t.title, slug: t.slug, type: t.type, difficulty: t.difficulty || 'medium',
      region: t.region || '', duration: t.duration, minParticipants: t.minParticipants,
      maxParticipants: t.maxParticipants, basePrice: t.basePrice || '', depositAmount: t.depositAmount || '',
      description: t.description || '', program: t.program || '', equipment: t.equipment || '',
      requirements: t.requirements || '', active: t.active, featured: t.featured,
    });
    setEditingTour(t);
  };

  const openEditDate = (d: any) => {
    setDateForm({
      tourId: d.tourId, startDate: d.startDate?.slice(0, 16) || '', endDate: d.endDate?.slice(0, 16) || '',
      seatsTotal: d.seatsTotal, price: d.price || '', depositAmount: d.depositAmount || '',
      status: d.status, notes: d.notes || '', instructorId: d.instructorId || '',
    });
    setEditingDate(d);
  };

  const BOOKING_BADGE: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-gray-100 text-gray-400',
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-1 flex gap-1">
        {[['tours', 'Туры', Waves], ['dates', 'Даты', Calendar], ['bookings', 'Бронирования', BookOpen]].map(([key, label, Icon]: any) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium flex-1 justify-center transition-colors ${tab === key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === 'tours' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Туры</h2>
            <button onClick={() => { setTourForm(emptyTour); setCreatingTour(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Создать тур
            </button>
          </div>
          {toursLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : tours.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><Waves className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Туров нет</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Тур</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Тип</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Группа</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Цена</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                  <th className="px-6 py-3"></th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {tours.map((t: any) => (
                    <tr key={t.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-sm text-gray-900">{t.title}</div>
                        <div className="text-xs text-gray-400">{t.region}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{TYPES.find(([v]) => v === t.type)?.[1] || t.type}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 flex items-center gap-1"><Users className="w-3.5 h-3.5" />{t.minParticipants}–{t.maxParticipants}</td>
                      <td className="px-6 py-4 text-sm font-medium">{t.basePrice ? `${Number(t.basePrice).toLocaleString('ru-RU')} ₽` : '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {t.active ? 'Активен' : 'Скрыт'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEditTour(t)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => setDeletingTourId(t.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'dates' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Даты туров</h2>
            <button onClick={() => { setDateForm(emptyDate); setCreatingDate(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Добавить дату
            </button>
          </div>
          {datesLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : dates.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Дат нет</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Тур</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Места</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Цена</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                  <th className="px-6 py-3"></th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {dates.map((d: any) => (
                    <tr key={d.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{d.tour?.title || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div>{new Date(d.startDate).toLocaleDateString('ru-RU')}</div>
                        <div className="text-xs text-gray-400">→ {new Date(d.endDate).toLocaleDateString('ru-RU')}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{d.seatsBooked}/{d.seatsTotal}</td>
                      <td className="px-6 py-4 text-sm font-medium">{Number(d.price).toLocaleString('ru-RU')} ₽</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          d.status === 'planned' ? 'bg-blue-100 text-blue-700' :
                          d.status === 'active' ? 'bg-green-100 text-green-700' :
                          d.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                          'bg-red-100 text-red-600'
                        }`}>{DATE_STATUSES.find(([v]) => v === d.status)?.[1] || d.status}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEditDate(d)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => setDeletingDateId(d.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'bookings' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Бронирования туров</h2>
          </div>
          {bookingsLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Бронирований нет</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Клиент</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Тур</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Участники</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сумма</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                  <th className="px-6 py-3"></th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {bookings.map((b: any) => (
                    <tr key={b.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-sm text-gray-900">{b.contactName}</div>
                        <div className="text-xs text-gray-400">{b.contactPhone}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div>{b.tour?.title || '—'}</div>
                        {b.tourDate && <div className="text-xs text-gray-400">{new Date(b.tourDate.startDate).toLocaleDateString('ru-RU')}</div>}
                      </td>
                      <td className="px-6 py-4 text-sm">{b.participantCount}</td>
                      <td className="px-6 py-4 text-sm font-medium">{Number(b.totalAmount).toLocaleString('ru-RU')} ₽</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${BOOKING_BADGE[b.status] || 'bg-gray-100 text-gray-700'}`}>
                          {BOOKING_STATUSES.find(([v]) => v === b.status)?.[1] || b.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select value={b.status}
                          onChange={e => updateBookingMut.mutate({ id: b.id, status: e.target.value })}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500">
                          {BOOKING_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {(creatingTour || editingTour) && (
        <Modal title={creatingTour ? 'Новый тур' : 'Редактировать тур'}
          onClose={() => { setCreatingTour(false); setEditingTour(null); }}>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Название *" col2>
                <input value={tourForm.title} onChange={e => setTourForm((f: any) => ({ ...f, title: e.target.value }))}
                  className={inputCls} placeholder="Рафтинг по реке Белой" />
              </Field>
              <Field label="Слаг">
                <input value={tourForm.slug} onChange={e => setTourForm((f: any) => ({ ...f, slug: e.target.value }))}
                  className={inputCls} placeholder="rafting-belaya" />
              </Field>
              <Field label="Тип">
                <select value={tourForm.type} onChange={e => setTourForm((f: any) => ({ ...f, type: e.target.value }))} className={inputCls}>
                  {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Сложность">
                <select value={tourForm.difficulty} onChange={e => setTourForm((f: any) => ({ ...f, difficulty: e.target.value }))} className={inputCls}>
                  {DIFFICULTIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Регион / Река">
                <input value={tourForm.region} onChange={e => setTourForm((f: any) => ({ ...f, region: e.target.value }))}
                  className={inputCls} placeholder="Республика Башкортостан" />
              </Field>
              <Field label="Длительность (дней)">
                <input type="number" value={tourForm.duration} onChange={e => setTourForm((f: any) => ({ ...f, duration: +e.target.value }))}
                  className={inputCls} min={1} />
              </Field>
              <Field label="Мин. участников">
                <input type="number" value={tourForm.minParticipants} onChange={e => setTourForm((f: any) => ({ ...f, minParticipants: +e.target.value }))}
                  className={inputCls} min={1} />
              </Field>
              <Field label="Макс. участников">
                <input type="number" value={tourForm.maxParticipants} onChange={e => setTourForm((f: any) => ({ ...f, maxParticipants: +e.target.value }))}
                  className={inputCls} min={1} />
              </Field>
              <Field label="Базовая цена (₽)">
                <input type="number" value={tourForm.basePrice} onChange={e => setTourForm((f: any) => ({ ...f, basePrice: e.target.value }))}
                  className={inputCls} placeholder="5000" />
              </Field>
              <Field label="Депозит (₽)">
                <input type="number" value={tourForm.depositAmount} onChange={e => setTourForm((f: any) => ({ ...f, depositAmount: e.target.value }))}
                  className={inputCls} placeholder="1000" />
              </Field>
              <Field label="Описание" col2>
                <textarea value={tourForm.description} onChange={e => setTourForm((f: any) => ({ ...f, description: e.target.value }))}
                  className={inputCls + ' resize-none'} rows={3} placeholder="Описание тура..." />
              </Field>
              <Field label="Программа" col2>
                <textarea value={tourForm.program} onChange={e => setTourForm((f: any) => ({ ...f, program: e.target.value }))}
                  className={inputCls + ' resize-none'} rows={2} placeholder="День 1: ..." />
              </Field>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={tourForm.active} onChange={e => setTourForm((f: any) => ({ ...f, active: e.target.checked }))} className="rounded" />
                Активен
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={tourForm.featured} onChange={e => setTourForm((f: any) => ({ ...f, featured: e.target.checked }))} className="rounded" />
                На главной
              </label>
            </div>
          </div>
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={() => { setCreatingTour(false); setEditingTour(null); }}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Отмена</button>
            <button
              onClick={() => creatingTour ? createTourMut.mutate(tourForm) : updateTourMut.mutate({ id: editingTour.id, data: tourForm })}
              disabled={createTourMut.isPending || updateTourMut.isPending}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {(createTourMut.isPending || updateTourMut.isPending) ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </Modal>
      )}

      {(creatingDate || editingDate) && (
        <Modal title={creatingDate ? 'Добавить дату' : 'Редактировать дату'}
          onClose={() => { setCreatingDate(false); setEditingDate(null); }}>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Тур *" col2>
                <select value={dateForm.tourId} onChange={e => setDateForm((f: any) => ({ ...f, tourId: +e.target.value }))} className={inputCls}>
                  <option value={0}>— Выберите тур —</option>
                  {tours.map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </Field>
              <Field label="Начало *">
                <input type="datetime-local" value={dateForm.startDate} onChange={e => setDateForm((f: any) => ({ ...f, startDate: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Конец *">
                <input type="datetime-local" value={dateForm.endDate} onChange={e => setDateForm((f: any) => ({ ...f, endDate: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Мест всего">
                <input type="number" value={dateForm.seatsTotal} onChange={e => setDateForm((f: any) => ({ ...f, seatsTotal: +e.target.value }))} className={inputCls} min={1} />
              </Field>
              <Field label="Цена (₽) *">
                <input type="number" value={dateForm.price} onChange={e => setDateForm((f: any) => ({ ...f, price: e.target.value }))} className={inputCls} placeholder="5000" />
              </Field>
              <Field label="Депозит (₽)">
                <input type="number" value={dateForm.depositAmount} onChange={e => setDateForm((f: any) => ({ ...f, depositAmount: e.target.value }))} className={inputCls} placeholder="1000" />
              </Field>
              <Field label="Инструктор">
                <select value={dateForm.instructorId} onChange={e => setDateForm((f: any) => ({ ...f, instructorId: e.target.value || '' }))} className={inputCls}>
                  <option value="">— Не назначен —</option>
                  {instructors.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                </select>
              </Field>
              <Field label="Статус">
                <select value={dateForm.status} onChange={e => setDateForm((f: any) => ({ ...f, status: e.target.value }))} className={inputCls}>
                  {DATE_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Заметки" col2>
                <textarea value={dateForm.notes} onChange={e => setDateForm((f: any) => ({ ...f, notes: e.target.value }))} className={inputCls + ' resize-none'} rows={2} />
              </Field>
            </div>
          </div>
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={() => { setCreatingDate(false); setEditingDate(null); }}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Отмена</button>
            <button
              onClick={() => creatingDate
                ? createDateMut.mutate({ tourId: dateForm.tourId, data: dateForm })
                : updateDateMut.mutate({ id: editingDate.id, data: dateForm })}
              disabled={createDateMut.isPending || updateDateMut.isPending}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {(createDateMut.isPending || updateDateMut.isPending) ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </Modal>
      )}

      {deletingTourId !== null && (
        <Modal title="Удалить тур?" onClose={() => setDeletingTourId(null)}>
          <div className="px-6 py-4"><p className="text-sm text-gray-600">Тур и все его даты будут удалены безвозвратно.</p></div>
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={() => setDeletingTourId(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Отмена</button>
            <button onClick={() => deleteTourMut.mutate(deletingTourId!)} disabled={deleteTourMut.isPending}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">
              {deleteTourMut.isPending ? 'Удаление...' : 'Удалить'}
            </button>
          </div>
        </Modal>
      )}

      {deletingDateId !== null && (
        <Modal title="Удалить дату?" onClose={() => setDeletingDateId(null)}>
          <div className="px-6 py-4"><p className="text-sm text-gray-600">Дата тура будет удалена.</p></div>
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={() => setDeletingDateId(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Отмена</button>
            <button onClick={() => deleteDateMut.mutate(deletingDateId!)} disabled={deleteDateMut.isPending}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">
              {deleteDateMut.isPending ? 'Удаление...' : 'Удалить'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
