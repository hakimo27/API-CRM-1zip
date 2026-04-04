import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Users, Search, Phone, Mail, ShoppingBag, Plus, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const SOURCES = ['site', 'telegram', 'phone', 'vk', 'instagram', 'referral', 'other'];
const SOURCE_LABELS: Record<string, string> = {
  site: 'Сайт', telegram: 'Telegram', phone: 'Телефон',
  vk: 'ВКонтакте', instagram: 'Instagram', referral: 'Рекомендация', other: 'Другое',
};

const emptyForm = {
  firstName: '', lastName: '', email: '', phone: '', source: 'site', notes: '', city: '',
};

export default function CustomersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(emptyForm);

  const { data: customers = [], isLoading } = useQuery<any[]>({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers'),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => api.post('/customers', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast({ title: 'Клиент добавлен' }); setCreating(false); setForm(emptyForm); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/customers/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast({ title: 'Сохранено' }); setEditing(null); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/customers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast({ title: 'Клиент удалён' }); setDeletingId(null); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return !search || c.firstName?.toLowerCase().includes(q) || c.lastName?.toLowerCase().includes(q)
      || c.email?.toLowerCase().includes(q) || c.phone?.includes(q);
  });

  const openEdit = (c: any) => {
    setForm({ firstName: c.firstName || '', lastName: c.lastName || '', email: c.email || '',
      phone: c.phone || '', source: c.source || 'site', notes: c.notes || '', city: c.city || '' });
    setEditing(c);
  };

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>{children}</div>
  );

  const CustomerForm = () => (
    <div className="px-6 py-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <F label="Имя *"><input value={form.firstName} onChange={e => setForm((f: any) => ({ ...f, firstName: e.target.value }))} className={inputCls} placeholder="Иван" /></F>
        <F label="Фамилия"><input value={form.lastName} onChange={e => setForm((f: any) => ({ ...f, lastName: e.target.value }))} className={inputCls} placeholder="Иванов" /></F>
        <F label="Email"><input type="email" value={form.email} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} className={inputCls} placeholder="ivan@example.com" /></F>
        <F label="Телефон"><input value={form.phone} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} className={inputCls} placeholder="+7 (999) 000-00-00" /></F>
        <F label="Город"><input value={form.city} onChange={e => setForm((f: any) => ({ ...f, city: e.target.value }))} className={inputCls} placeholder="Москва" /></F>
        <F label="Источник">
          <select value={form.source} onChange={e => setForm((f: any) => ({ ...f, source: e.target.value }))} className={inputCls}>
            {SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
          </select>
        </F>
      </div>
      <F label="Заметки">
        <textarea value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))}
          className={inputCls + ' resize-none'} rows={2} placeholder="Заметки о клиенте..." />
      </F>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex gap-3 flex-col sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по имени, email, телефону..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <button onClick={() => { setForm(emptyForm); setCreating(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Добавить
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Клиенты</h2>
          <span className="text-sm text-gray-400">{filtered.length} записей</span>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400"><Users className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Клиенты не найдены</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Клиент</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Контакт</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Источник</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Заказы</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сумма</th>
                <th className="px-6 py-3"></th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700 text-sm flex-shrink-0">
                          {(c.firstName || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-900">{c.firstName} {c.lastName}</div>
                          {c.city && <div className="text-xs text-gray-400">{c.city}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {c.email && <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1"><Mail className="w-3.5 h-3.5" />{c.email}</div>}
                      {c.phone && <div className="flex items-center gap-1.5 text-xs text-gray-600"><Phone className="w-3.5 h-3.5" />{c.phone}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{SOURCE_LABELS[c.source] || c.source || '—'}</td>
                    <td className="px-6 py-4"><div className="flex items-center gap-1.5 text-sm text-gray-700"><ShoppingBag className="w-4 h-4 text-gray-400" />{c.ordersCount || 0}</div></td>
                    <td className="px-6 py-4 text-sm font-medium">{Number(c.totalSpent || 0).toLocaleString('ru-RU')} ₽</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => setDeletingId(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(creating || editing) && (
        <Modal title={creating ? 'Новый клиент' : 'Редактировать клиента'} onClose={() => { setCreating(false); setEditing(null); }}>
          <CustomerForm />
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={() => { setCreating(false); setEditing(null); }}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Отмена</button>
            <button onClick={() => creating ? createMut.mutate(form) : updateMut.mutate({ id: editing.id, data: form })}
              disabled={createMut.isPending || updateMut.isPending}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {(createMut.isPending || updateMut.isPending) ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </Modal>
      )}

      {deletingId !== null && (
        <Modal title="Удалить клиента?" onClose={() => setDeletingId(null)}>
          <div className="px-6 py-4"><p className="text-sm text-gray-600">Клиент будет удалён. История заказов сохранится.</p></div>
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={() => setDeletingId(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Отмена</button>
            <button onClick={() => deleteMut.mutate(deletingId!)} disabled={deleteMut.isPending}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">
              {deleteMut.isPending ? 'Удаление...' : 'Удалить'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
