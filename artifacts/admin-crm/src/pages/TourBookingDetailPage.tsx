import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Link } from 'wouter';
import { useState } from 'react';
import {
  ChevronLeft, Loader2, Edit2, Check, X, User, MapPin,
  Mountain, Calendar, Clock, MessageSquare, Users,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STATUSES = [
  { value: 'pending', label: 'Ожидает', color: 'bg-blue-100 text-blue-700' },
  { value: 'confirmed', label: 'Подтверждено', color: 'bg-green-100 text-green-700' },
  { value: 'completed', label: 'Завершено', color: 'bg-gray-100 text-gray-600' },
  { value: 'cancelled', label: 'Отменено', color: 'bg-red-100 text-red-600' },
];

function fmtDate(d: any) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateTime(d: any) {
  if (!d) return '—';
  return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function TourBookingDetailPage({ id }: { id: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const numId = parseInt(id);

  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [editingNotes, setEditingNotes] = useState(false);
  const [editNotes, setEditNotes] = useState('');

  const { data: booking, isLoading } = useQuery<any>({
    queryKey: ['tour-booking-detail', numId],
    queryFn: () => api.get(`/tours/bookings/${numId}`),
    enabled: !isNaN(numId),
    onSuccess: (data: any) => {
      setEditData({
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail || '',
        participantCount: data.participantCount,
        totalAmount: data.totalAmount,
      });
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['tour-booking-detail', numId] });

  const statusMut = useMutation({
    mutationFn: (status: string) => api.patch(`/tours/bookings/${numId}`, { status }),
    onSuccess: () => { invalidate(); toast({ title: 'Статус обновлён' }); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const updateMut = useMutation({
    mutationFn: (data: any) => api.patch(`/tours/bookings/${numId}`, data),
    onSuccess: () => {
      invalidate();
      setEditMode(false);
      toast({ title: 'Сохранено' });
    },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">😕</div>
        <p className="text-gray-500">Бронирование не найдено</p>
        <Link href="/tour-bookings" className="text-blue-600 hover:underline mt-2 inline-block">← К бронированиям</Link>
      </div>
    );
  }

  const statusInfo = STATUSES.find(s => s.value === booking.status);
  const isActive = !['completed', 'cancelled'].includes(booking.status);

  const handleSaveContact = () => {
    updateMut.mutate({
      contactName: editData.contactName,
      contactPhone: editData.contactPhone,
      contactEmail: editData.contactEmail || null,
      participantCount: parseInt(editData.participantCount) || booking.participantCount,
      totalAmount: editData.totalAmount || booking.totalAmount,
    });
  };

  return (
    <div className="space-y-5 max-w-4xl pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/tour-bookings" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-bold text-gray-900 text-xl">
              {booking.tour?.name || 'Бронирование тура'}
            </h2>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo?.color || 'bg-gray-100 text-gray-700'}`}>
              {statusInfo?.label || booking.status}
            </span>
          </div>
          <div className="text-sm text-gray-400 mt-0.5">
            ID #{booking.id} · Создано {fmtDateTime(booking.createdAt)}
          </div>
        </div>
        {isActive && (
          <div className="flex gap-2">
            <button
              onClick={() => statusMut.mutate('confirmed')}
              disabled={statusMut.isPending || booking.status === 'confirmed'}
              className="px-3 py-2 text-sm bg-green-50 text-green-700 border border-green-200 rounded-xl hover:bg-green-100 transition-colors font-medium disabled:opacity-50"
            >
              Подтвердить
            </button>
            <button
              onClick={() => statusMut.mutate('cancelled')}
              disabled={statusMut.isPending}
              className="px-3 py-2 text-sm bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-colors font-medium"
            >
              Отменить
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left */}
        <div className="lg:col-span-2 space-y-5">
          {/* Status */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" /> Статус бронирования
            </h3>
            <div className="flex gap-2 flex-wrap">
              {STATUSES.map(s => (
                <button
                  key={s.value}
                  onClick={() => statusMut.mutate(s.value)}
                  disabled={statusMut.isPending || s.value === booking.status}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    s.value === booking.status
                      ? s.color + ' border-current ring-2 ring-offset-1 ring-current opacity-80'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contact info (editable) */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2"><User className="w-4 h-4 text-blue-600" /> Контактное лицо</span>
              {!editMode && (
                <button onClick={() => {
                  setEditData({
                    contactName: booking.contactName,
                    contactPhone: booking.contactPhone,
                    contactEmail: booking.contactEmail || '',
                    participantCount: booking.participantCount,
                    totalAmount: booking.totalAmount || '',
                  });
                  setEditMode(true);
                }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <Edit2 className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </h3>

            {editMode ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Имя</label>
                    <input
                      value={editData.contactName || ''}
                      onChange={e => setEditData({ ...editData, contactName: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Телефон</label>
                    <input
                      value={editData.contactPhone || ''}
                      onChange={e => setEditData({ ...editData, contactPhone: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Email</label>
                    <input
                      type="email"
                      value={editData.contactEmail || ''}
                      onChange={e => setEditData({ ...editData, contactEmail: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Участников</label>
                    <input
                      type="number" min="1"
                      value={editData.participantCount || 1}
                      onChange={e => setEditData({ ...editData, participantCount: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Сумма (₽)</label>
                    <input
                      type="number"
                      value={editData.totalAmount || ''}
                      onChange={e => setEditData({ ...editData, totalAmount: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveContact}
                    disabled={updateMut.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {updateMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Сохранить
                  </button>
                  <button onClick={() => setEditMode(false)} className="px-4 py-2 text-sm text-gray-600 rounded-xl hover:bg-gray-100 transition-colors">
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-gray-700">
                <div className="font-medium text-gray-900">{booking.contactName || '—'}</div>
                {booking.contactPhone && <div className="text-gray-500">{booking.contactPhone}</div>}
                {booking.contactEmail && <div className="text-gray-500">{booking.contactEmail}</div>}
                <div className="flex items-center gap-2 pt-1 border-t border-gray-100 text-gray-500">
                  <Users className="w-4 h-4" />
                  <span>{booking.participantCount} участник(ов)</span>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-blue-600" /> Заметки</span>
              {!editingNotes && (
                <button onClick={() => { setEditNotes(booking.notes || ''); setEditingNotes(true); }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <Edit2 className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </h3>
            {editingNotes ? (
              <div className="space-y-2">
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                <div className="flex gap-2">
                  <button
                    onClick={() => { updateMut.mutate({ notes: editNotes }); setEditingNotes(false); }}
                    className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    Сохранить
                  </button>
                  <button onClick={() => setEditingNotes(false)} className="px-3 py-2 text-sm text-gray-500 rounded-xl hover:bg-gray-50 transition-colors">
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">{booking.notes || <span className="italic text-gray-300">Нет заметок</span>}</p>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="space-y-5">
          {/* Tour info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Mountain className="w-4 h-4 text-blue-600" /> Тур
            </h3>
            <div className="space-y-3 text-sm">
              {booking.tour && (
                <div className="font-medium text-gray-900">{booking.tour.name}</div>
              )}
              {booking.tourDate && (
                <>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{fmtDate(booking.tourDate.startDate)}</span>
                    {booking.tourDate.endDate && booking.tourDate.endDate !== booking.tourDate.startDate && (
                      <span>— {fmtDate(booking.tourDate.endDate)}</span>
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 border-t border-gray-100 pt-2">
                    <span>Мест всего</span>
                    <span>{booking.tourDate.seatsTotal}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Мест занято</span>
                    <span>{booking.tourDate.seatsBooked}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Financials */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Финансы</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Участников</span>
                <span className="font-medium">{booking.participantCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Сумма</span>
                <span className="font-bold text-blue-700 text-base">
                  {booking.totalAmount ? `${Number(booking.totalAmount).toLocaleString('ru-RU')} ₽` : '—'}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2">
                <span className="text-gray-500">Депозит</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${booking.depositPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {booking.depositPaid ? 'Внесён' : 'Не внесён'}
                </span>
              </div>
            </div>
            {isActive && (
              <button
                onClick={() => updateMut.mutate({ depositPaid: !booking.depositPaid })}
                className={`w-full mt-3 py-2 text-sm font-medium rounded-xl border transition-colors ${
                  booking.depositPaid
                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                    : 'border-green-200 text-green-700 hover:bg-green-50'
                }`}
              >
                {booking.depositPaid ? 'Снять отметку о депозите' : 'Отметить депозит оплаченным'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
