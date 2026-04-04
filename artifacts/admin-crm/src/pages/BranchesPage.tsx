import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Building2, MapPin, Phone, Mail, Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>{children}</div>;
}

const BRANCH_TYPES = [['main', 'Главный'], ['satellite', 'Филиал'], ['partner', 'Партнёр']];

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const emptyForm = {
  name: '', slug: '', type: 'satellite', city: 'Москва', address: '',
  phones: '', emails: '', description: '', workingHours: '',
  lat: '', lng: '', sortOrder: 0, active: true, useForPickup: false,
};

export default function BranchesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(emptyForm);

  const { data: branches = [], isLoading } = useQuery<any[]>({
    queryKey: ['branches-admin'],
    queryFn: () => api.get('/branches/admin'),
  });

  const toPayload = (data: any) => ({
    ...data,
    phones: data.phones ? data.phones.split(',').map((p: string) => p.trim()).filter(Boolean) : [],
    emails: data.emails ? data.emails.split(',').map((e: string) => e.trim()).filter(Boolean) : [],
    lat: data.lat !== '' ? data.lat : null,
    lng: data.lng !== '' ? data.lng : null,
    workingHours: data.workingHours ? { schedule: data.workingHours } : {},
  });

  const createMut = useMutation({
    mutationFn: (data: any) => api.post('/branches', toPayload(data)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches-admin'] }); toast({ title: 'Филиал создан' }); setCreating(false); setForm(emptyForm); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/branches/${id}`, toPayload(data)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches-admin'] }); toast({ title: 'Сохранено' }); setEditing(null); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/branches/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches-admin'] }); toast({ title: 'Филиал удалён' }); setDeletingId(null); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: any) => api.patch(`/branches/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches-admin'] }),
  });

  const openEdit = (b: any) => {
    const wh = b.workingHours;
    setForm({
      name: b.name, slug: b.slug, type: b.type, city: b.city, address: b.address || '',
      phones: Array.isArray(b.phones) ? b.phones.join(', ') : '',
      emails: Array.isArray(b.emails) ? b.emails.join(', ') : '',
      description: b.description || '',
      workingHours: wh?.schedule || (typeof wh === 'string' ? wh : ''),
      lat: b.lat || '', lng: b.lng || '',
      sortOrder: b.sortOrder || 0,
      active: b.active, useForPickup: b.useForPickup || false,
    });
    setEditing(b);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex justify-between items-center">
        <div>
          <h2 className="font-semibold text-gray-900">Филиалы и пункты выдачи</h2>
          <p className="text-sm text-gray-400">Управление точками проката и самовывоза</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setCreating(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : branches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-16 text-gray-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Филиалов нет</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b: any) => (
            <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{b.name}</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400">{BRANCH_TYPES.find(([v]) => v === b.type)?.[1]}</span>
                      {b.useForPickup && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Самовывоз</span>}
                    </div>
                  </div>
                </div>
                <button onClick={() => toggleMut.mutate({ id: b.id, active: !b.active })}
                  className={`${b.active ? 'text-green-600' : 'text-gray-400'}`}>
                  {b.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
              </div>
              {b.address && <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1"><MapPin className="w-3.5 h-3.5" />{b.city}, {b.address}</div>}
              {Array.isArray(b.phones) && b.phones[0] && <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1"><Phone className="w-3.5 h-3.5" />{b.phones[0]}</div>}
              {Array.isArray(b.emails) && b.emails[0] && <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3"><Mail className="w-3.5 h-3.5" />{b.emails[0]}</div>}
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button onClick={() => openEdit(b)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg">
                  <Pencil className="w-3.5 h-3.5" /> Изменить
                </button>
                <button onClick={() => setDeletingId(b.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-3.5 h-3.5" /> Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <Modal title={creating ? 'Новый филиал' : 'Редактировать филиал'} onClose={() => { setCreating(false); setEditing(null); }}>
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <F label="Название *">
                <input value={form.name}
                  onChange={e => setForm((f: any) => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))}
                  className={inputCls} placeholder="Центральный офис" />
              </F>
              <F label="Слаг">
                <input value={form.slug} onChange={e => setForm((f: any) => ({ ...f, slug: e.target.value }))} className={inputCls} />
              </F>
              <F label="Тип">
                <select value={form.type} onChange={e => setForm((f: any) => ({ ...f, type: e.target.value }))} className={inputCls}>
                  {BRANCH_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </F>
              <F label="Город">
                <input value={form.city} onChange={e => setForm((f: any) => ({ ...f, city: e.target.value }))} className={inputCls} placeholder="Москва" />
              </F>
            </div>

            <F label="Адрес">
              <input value={form.address} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value }))} className={inputCls} placeholder="ул. Ленина, 1" />
            </F>

            <div className="grid grid-cols-2 gap-3">
              <F label="Телефоны (через запятую)">
                <input value={form.phones} onChange={e => setForm((f: any) => ({ ...f, phones: e.target.value }))} className={inputCls} placeholder="+7 999 000-00-00" />
              </F>
              <F label="Email (через запятую)">
                <input value={form.emails} onChange={e => setForm((f: any) => ({ ...f, emails: e.target.value }))} className={inputCls} placeholder="info@example.com" />
              </F>
              <F label="Широта (lat)">
                <input type="number" step="any" value={form.lat} onChange={e => setForm((f: any) => ({ ...f, lat: e.target.value }))} className={inputCls} placeholder="55.751244" />
              </F>
              <F label="Долгота (lng)">
                <input type="number" step="any" value={form.lng} onChange={e => setForm((f: any) => ({ ...f, lng: e.target.value }))} className={inputCls} placeholder="37.618423" />
              </F>
              <F label="Порядок сортировки">
                <input type="number" value={form.sortOrder} onChange={e => setForm((f: any) => ({ ...f, sortOrder: +e.target.value }))} className={inputCls} />
              </F>
            </div>

            <F label="Режим работы">
              <input value={form.workingHours} onChange={e => setForm((f: any) => ({ ...f, workingHours: e.target.value }))}
                className={inputCls} placeholder="Пн–Вс: 9:00–20:00" />
            </F>

            <F label="Описание">
              <textarea value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
                className={inputCls + ' resize-none'} rows={2} />
            </F>

            <div className="flex gap-6 flex-wrap">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active} onChange={e => setForm((f: any) => ({ ...f, active: e.target.checked }))} className="rounded" />
                Активен
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.useForPickup} onChange={e => setForm((f: any) => ({ ...f, useForPickup: e.target.checked }))} className="rounded" />
                Пункт самовывоза
              </label>
            </div>
          </div>
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-white rounded-b-2xl">
            <button onClick={() => { setCreating(false); setEditing(null); }}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Отмена</button>
            <button onClick={() => creating ? createMut.mutate(form) : updateMut.mutate({ id: editing.id, data: form })}
              disabled={createMut.isPending || updateMut.isPending}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {(createMut.isPending || updateMut.isPending) ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </Modal>
      )}

      {deletingId !== null && (
        <Modal title="Удалить филиал?" onClose={() => setDeletingId(null)}>
          <div className="px-6 py-4">
            <p className="text-sm text-gray-600 mb-2">Если этот филиал используется как пункт самовывоза, он исчезнет из оформления заказа и страницы контактов.</p>
            <p className="text-sm text-gray-500">Рекомендуется деактивировать вместо удаления.</p>
          </div>
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={() => setDeletingId(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Отмена</button>
            <button onClick={() => {
              const b = branches.find((x: any) => x.id === deletingId);
              if (b?.active) {
                updateMut.mutate({ id: deletingId!, data: { active: false } });
                setDeletingId(null);
              } else {
                deleteMut.mutate(deletingId!);
              }
            }} disabled={deleteMut.isPending}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">
              {deleteMut.isPending ? 'Удаление...' : 'Удалить'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
