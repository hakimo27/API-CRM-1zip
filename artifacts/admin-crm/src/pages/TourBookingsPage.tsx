import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Search, RefreshCw, ChevronRight, Plus, X, Save, CalendarCheck } from 'lucide-react';
import { PhoneInput } from '@/components/PhoneInput';
import { Link, useSearch } from 'wouter';
import { useToast } from '@/hooks/use-toast';

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  paid: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-600',
  completed: 'bg-gray-100 text-gray-600',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Ожидает', confirmed: 'Подтверждено',
  paid: 'Оплачено', cancelled: 'Отменено', completed: 'Завершено',
};

const STATUSES = Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }));

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

const emptyForm = {
  tourId: '',
  tourDateId: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  participants: '1',
  totalAmount: '',
  depositAmount: '',
  notes: '',
};

function CreateBookingModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<any>(emptyForm);
  const sf = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const { data: tours = [] } = useQuery<any[]>({
    queryKey: ['tours-admin'],
    queryFn: () => api.get('/tours/admin'),
  });

  const { data: tourDates = [] } = useQuery<any[]>({
    queryKey: ['tour-dates-all'],
    queryFn: () => api.get('/tours/dates'),
    enabled: true,
  });

  const filteredDates = form.tourId
    ? tourDates.filter((d: any) => String(d.tourId) === String(form.tourId) && d.status !== 'cancelled')
    : [];

  const selectedTour = tours.find((t: any) => String(t.id) === String(form.tourId));
  const selectedDate = filteredDates.find((d: any) => String(d.id) === String(form.tourDateId));

  // Auto-fill price when date changes
  useEffect(() => {
    if (selectedDate && !form.totalAmount) {
      const price = selectedDate.price || selectedTour?.basePrice || '';
      const deposit = selectedDate.depositAmount || selectedTour?.depositAmount || '';
      const participants = Number(form.participants) || 1;
      sf('totalAmount', price ? String(Number(price) * participants) : '');
      sf('depositAmount', deposit ? String(deposit) : '');
    }
  }, [form.tourDateId, form.tourId]);

  useEffect(() => {
    if (selectedDate) {
      const price = selectedDate.price || selectedTour?.basePrice || 0;
      const participants = Number(form.participants) || 1;
      if (price) sf('totalAmount', String(Number(price) * participants));
    }
  }, [form.participants]);

  const createMut = useMutation({
    mutationFn: (data: any) => api.post(`/tours/${form.tourId}/book`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tour-bookings'] });
      toast({ title: 'Бронирование создано' });
      onClose();
    },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const handleSave = () => {
    if (!form.tourId) return toast({ title: 'Выберите тур', variant: 'destructive' });
    if (!form.contactName) return toast({ title: 'Укажите имя клиента', variant: 'destructive' });
    if (!form.contactPhone) return toast({ title: 'Укажите телефон', variant: 'destructive' });
    createMut.mutate({
      tourDateId: form.tourDateId ? Number(form.tourDateId) : undefined,
      contactName: form.contactName,
      contactPhone: form.contactPhone,
      contactEmail: form.contactEmail || undefined,
      participants: Number(form.participants) || 1,
      totalAmount: form.totalAmount ? Number(form.totalAmount) : undefined,
      depositAmount: form.depositAmount ? Number(form.depositAmount) : undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-gray-900">Новое бронирование тура</h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <F label="Тур *">
            <select value={form.tourId} onChange={e => { sf('tourId', e.target.value); sf('tourDateId', ''); }} className={inputCls}>
              <option value="">— выбрать тур —</option>
              {tours.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name || t.title}</option>
              ))}
            </select>
          </F>

          {filteredDates.length > 0 && (
            <F label="Дата тура">
              <select value={form.tourDateId} onChange={e => sf('tourDateId', e.target.value)} className={inputCls}>
                <option value="">— выбрать дату (необязательно) —</option>
                {filteredDates.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {new Date(d.startDate).toLocaleDateString('ru-RU')}
                    {d.endDate ? ` – ${new Date(d.endDate).toLocaleDateString('ru-RU')}` : ''}
                    {d.price ? ` • ${Number(d.price).toLocaleString('ru-RU')} ₽/чел.` : ''}
                    {` • мест: ${d.seatsAvailable ?? d.seatsTotal ?? '?'}`}
                  </option>
                ))}
              </select>
            </F>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <F label="Имя клиента *">
                <input value={form.contactName} onChange={e => sf('contactName', e.target.value)}
                  className={inputCls} placeholder="Иван Петров" />
              </F>
            </div>
            <F label="Телефон *">
              <PhoneInput value={form.contactPhone} onChange={v => sf('contactPhone', v)} className={inputCls} />
            </F>
            <F label="Email">
              <input value={form.contactEmail} onChange={e => sf('contactEmail', e.target.value)}
                className={inputCls} placeholder="ivan@mail.ru" />
            </F>
            <F label="Участников *">
              <input type="number" min="1" value={form.participants} onChange={e => sf('participants', e.target.value)}
                className={inputCls} />
            </F>
            <F label="Сумма (₽)">
              <input type="number" value={form.totalAmount} onChange={e => sf('totalAmount', e.target.value)}
                className={inputCls} placeholder="5000" />
            </F>
            <F label="Залог / предоплата (₽)">
              <input type="number" value={form.depositAmount} onChange={e => sf('depositAmount', e.target.value)}
                className={inputCls} placeholder="1000" />
            </F>
          </div>

          <F label="Примечания">
            <textarea value={form.notes} onChange={e => sf('notes', e.target.value)}
              className={inputCls + ' resize-none'} rows={2}
              placeholder="Дополнительная информация..." />
          </F>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-white rounded-b-2xl">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            Отмена
          </button>
          <button onClick={handleSave} disabled={createMut.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <Save className="w-4 h-4" />
            {createMut.isPending ? 'Создание...' : 'Создать бронирование'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TourBookingsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const searchStr = useSearch();

  useEffect(() => {
    if (searchStr.includes('create=1')) setCreating(true);
  }, []);

  const { data: bookings = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['tour-bookings', statusFilter],
    queryFn: () => {
      const q = statusFilter ? `?status=${statusFilter}` : '';
      return api.get(`/tours/bookings${q}`);
    },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/tours/bookings/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tour-bookings'] });
      toast({ title: 'Статус обновлён' });
    },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const filtered = search
    ? bookings.filter(b =>
        b.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        b.contactName?.toLowerCase().includes(search.toLowerCase()) ||
        b.customerPhone?.includes(search) ||
        b.contactPhone?.includes(search) ||
        b.tour?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : bookings;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по клиенту, туру..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <button onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-sm transition-colors">
            <RefreshCw className="w-4 h-4" /> Обновить
          </button>
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Новое бронирование
          </button>
        </div>

        <div className="flex gap-2 flex-wrap mt-3">
          <button onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!statusFilter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Все
          </button>
          {STATUSES.map(s => (
            <button key={s.value} onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === s.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Бронирования туров</h2>
          <span className="text-sm text-gray-400">{filtered.length} записей</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">🚣</div>
            <p>Бронирований туров не найдено</p>
            <button onClick={() => setCreating(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Создать бронирование
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Тур</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Дата тура</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Клиент</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Участников</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Сумма</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Создано</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((b: any) => (
                  <tr key={b.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                    <td className="px-6 py-4">
                      <Link href={`/tour-bookings/${b.id}`} className="font-medium text-sm text-blue-700 hover:underline">
                        {b.tour?.name || b.tourName || '—'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {b.tourDate?.startDate
                        ? new Date(b.tourDate.startDate).toLocaleDateString('ru-RU')
                        : b.startDate
                        ? new Date(b.startDate).toLocaleDateString('ru-RU')
                        : '—'}
                    </td>
                    <td className="px-6 py-4 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate max-w-[150px]">
                        {b.contactName || b.customerName || '—'}
                      </div>
                      <div className="text-xs text-gray-400">{b.contactPhone || b.customerPhone || ''}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium text-center">
                      {b.participants || b.quantity || 1}
                    </td>
                    <td className="px-6 py-4 font-semibold text-sm text-gray-900 whitespace-nowrap">
                      {b.totalAmount ? `${Number(b.totalAmount).toLocaleString('ru-RU')} ₽` : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={b.status}
                        onChange={e => statusMut.mutate({ id: b.id, status: e.target.value })}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 ${STATUS_BADGE[b.status] || 'bg-gray-100 text-gray-700'}`}>
                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/tour-bookings/${b.id}`}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1.5 rounded-lg transition-colors">
                        Открыть <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {creating && <CreateBookingModal onClose={() => setCreating(false)} />}
    </div>
  );
}
