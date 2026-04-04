import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Store, Search, Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
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

const emptyForm = {
  name: '', slug: '', sku: '', price: '', stock: 0,
  description: '', shortDescription: '', active: true, featured: false,
};

export default function SaleProductsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(emptyForm);

  const { data: products = [], isLoading } = useQuery<any[]>({
    queryKey: ['sale-products-admin'],
    queryFn: () => api.get('/sales/products/admin'),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => api.post('/sales/products', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sale-products-admin'] }); toast({ title: 'Товар создан' }); setCreating(false); setForm(emptyForm); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/sales/products/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sale-products-admin'] }); toast({ title: 'Сохранено' }); setEditing(null); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/sales/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sale-products-admin'] }); toast({ title: 'Товар удалён' }); setDeletingId(null); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    return !search || p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
  });

  const openEdit = (p: any) => {
    setForm({ name: p.name, slug: p.slug, sku: p.sku || '', price: p.price || '', stock: p.stock || 0,
      description: p.description || '', shortDescription: p.shortDescription || '', active: p.active, featured: p.featured });
    setEditing(p);
  };

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>{children}</div>
  );

  const ProductForm = () => (
    <div className="px-6 py-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <F label="Название *">
          <input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))}
            className={inputCls} placeholder="Весло туристическое" />
        </F>
        <F label="Слаг">
          <input value={form.slug} onChange={e => setForm((f: any) => ({ ...f, slug: e.target.value }))} className={inputCls} />
        </F>
        <F label="Артикул">
          <input value={form.sku} onChange={e => setForm((f: any) => ({ ...f, sku: e.target.value }))} className={inputCls} placeholder="SKU-001" />
        </F>
        <F label="Цена (₽) *">
          <input type="number" value={form.price} onChange={e => setForm((f: any) => ({ ...f, price: e.target.value }))} className={inputCls} placeholder="2500" />
        </F>
        <F label="Остаток на складе">
          <input type="number" value={form.stock} onChange={e => setForm((f: any) => ({ ...f, stock: +e.target.value }))} className={inputCls} />
        </F>
        <F label="Краткое описание">
          <input value={form.shortDescription} onChange={e => setForm((f: any) => ({ ...f, shortDescription: e.target.value }))} className={inputCls} />
        </F>
        <F label="Описание">
          <textarea value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
            className={inputCls + ' resize-none col-span-2'} rows={3} />
        </F>
      </div>
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e => setForm((f: any) => ({ ...f, active: e.target.checked }))} className="rounded" />Активен</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={e => setForm((f: any) => ({ ...f, featured: e.target.checked }))} className="rounded" />Рекомендуемый</label>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex gap-3 flex-col sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по названию, артикулу..."
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
          <h2 className="font-semibold text-gray-900">Товары на продажу</h2>
          <span className="text-sm text-gray-400">{filtered.length} товаров</span>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400"><Store className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Товаров нет</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Товар</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Артикул</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Цена</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Остаток</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="px-6 py-3"></th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-sm text-gray-900">{p.name}</div>
                      {p.shortDescription && <div className="text-xs text-gray-400 truncate max-w-[200px]">{p.shortDescription}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{p.sku || '—'}</td>
                    <td className="px-6 py-4 text-sm font-medium">{p.price ? `${Number(p.price).toLocaleString('ru-RU')} ₽` : '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.stock ?? '—'}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => updateMut.mutate({ id: p.id, data: { active: !p.active } })}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {p.active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        {p.active ? 'Активен' : 'Скрыт'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => setDeletingId(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
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
        <Modal title={creating ? 'Новый товар' : 'Редактировать товар'} onClose={() => { setCreating(false); setEditing(null); }}>
          <ProductForm />
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
        <Modal title="Удалить товар?" onClose={() => setDeletingId(null)}>
          <div className="px-6 py-4"><p className="text-sm text-gray-600">Товар будет удалён из каталога продаж.</p></div>
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
