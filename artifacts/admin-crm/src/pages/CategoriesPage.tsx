import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { GitBranch, Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react';
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

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const emptyForm = { name: '', slug: '', description: '', active: true, sortOrder: 0 };

export default function CategoriesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(emptyForm);

  const { data: categories = [], isLoading } = useQuery<any[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories'),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => api.post('/categories', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast({ title: 'Категория создана' }); setCreating(false); setForm(emptyForm); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/categories/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast({ title: 'Сохранено' }); setEditing(null); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast({ title: 'Категория удалена' }); setDeletingId(null); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const openEdit = (c: any) => {
    setForm({ name: c.name, slug: c.slug, description: c.description || '', active: c.active, sortOrder: c.sortOrder || 0 });
    setEditing(c);
  };

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>{children}</div>
  );

  const CatForm = () => (
    <div className="px-6 py-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <F label="Название *">
          <input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))}
            className={inputCls} placeholder="Байдарки" />
        </F>
        <F label="Слаг">
          <input value={form.slug} onChange={e => setForm((f: any) => ({ ...f, slug: e.target.value }))} className={inputCls} />
        </F>
        <F label="Порядок сортировки">
          <input type="number" value={form.sortOrder} onChange={e => setForm((f: any) => ({ ...f, sortOrder: +e.target.value }))} className={inputCls} />
        </F>
      </div>
      <F label="Описание">
        <textarea value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
          className={inputCls + ' resize-none'} rows={2} placeholder="Описание категории..." />
      </F>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.active} onChange={e => setForm((f: any) => ({ ...f, active: e.target.checked }))} className="rounded" />
        Активна
      </label>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex justify-between items-center">
        <div><h2 className="font-semibold text-gray-900">Категории</h2><p className="text-sm text-gray-400">Классификация товаров и туров</p></div>
        <button onClick={() => { setForm(emptyForm); setCreating(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12 text-gray-400"><GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Категорий нет</p></div>
        ) : (
          <table className="w-full">
            <thead><tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Слаг</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Порядок</th>
              <th className="px-6 py-3"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {categories.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-sm text-gray-900">{c.name}</div>
                    {c.description && <div className="text-xs text-gray-400 truncate max-w-[200px]">{c.description}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{c.slug}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => updateMut.mutate({ id: c.id, data: { active: !c.active } })}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {c.active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                      {c.active ? 'Активна' : 'Скрыта'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{c.sortOrder}</td>
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
        )}
      </div>

      {(creating || editing) && (
        <Modal title={creating ? 'Новая категория' : 'Редактировать категорию'} onClose={() => { setCreating(false); setEditing(null); }}>
          <CatForm />
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={() => { setCreating(false); setEditing(null); }} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Отмена</button>
            <button onClick={() => creating ? createMut.mutate(form) : updateMut.mutate({ id: editing.id, data: form })}
              disabled={createMut.isPending || updateMut.isPending}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {(createMut.isPending || updateMut.isPending) ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </Modal>
      )}

      {deletingId !== null && (
        <Modal title="Удалить категорию?" onClose={() => setDeletingId(null)}>
          <div className="px-6 py-4"><p className="text-sm text-gray-600">Категория будет удалена. Товары в ней останутся без категории.</p></div>
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
