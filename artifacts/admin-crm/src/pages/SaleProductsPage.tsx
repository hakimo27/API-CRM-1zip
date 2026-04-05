import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Store, Search, Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from '@/components/ImageUpload';
import SpecEditor, { type SpecRow } from '@/components/SpecEditor';

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>{children}</div>;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const CONDITION_OPTS = [
  ['new', 'Новый'], ['excellent', 'Отличное'], ['good', 'Хорошее'],
  ['fair', 'Удовлетворительное'], ['poor', 'Плохое'],
];

const emptyForm = {
  name: '', slug: '', sku: '', price: '', stock: 0,
  description: '', shortDescription: '', active: true, featured: false,
  isUsed: false, condition: 'new', manufactureYear: '', inventoryNo: '',
  images: [] as string[],
  specs: [] as SpecRow[],
};

type Tab = 'basic' | 'specs' | 'photos';

export default function SaleProductsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [tab, setTab] = useState<Tab>('basic');

  const { data: products = [], isLoading } = useQuery<any[]>({
    queryKey: ['sale-products-admin'],
    queryFn: () => api.get('/sales/products/admin'),
  });

  const buildPayload = (data: any) => ({
    ...data,
    stockQuantity: data.stock,
    stock: undefined,
    manufactureYear: data.manufactureYear ? Number(data.manufactureYear) : null,
    specifications: data.specs.length > 0
      ? data.specs.map((s: SpecRow, i: number) => ({ label: s.label, value: s.value, unit: s.unit, sortOrder: i }))
      : [],
    specs: undefined,
  });

  const createMut = useMutation({
    mutationFn: (data: any) => api.post('/sales/products', buildPayload(data)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sale-products-admin'] }); toast({ title: 'Товар создан' }); setCreating(false); setForm(emptyForm); setTab('basic'); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/sales/products/${id}`, buildPayload(data)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sale-products-admin'] }); toast({ title: 'Сохранено' }); setEditing(null); setTab('basic'); },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  // Toggle active without rebuilding specs
  const toggleActive = (p: any) => updateMut.mutate({
    id: p.id,
    data: {
      ...p,
      stock: p.stockQuantity ?? p.stock ?? 0,
      active: !p.active,
      specs: Array.isArray(p.specifications)
        ? p.specifications.map((s: any, i: number) => ({ label: s.label || '', value: s.value || '', unit: s.unit || '', sortOrder: i }))
        : [],
    },
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
    const rawSpecs = Array.isArray(p.specifications) ? p.specifications : [];
    setForm({
      name: p.name, slug: p.slug, sku: p.sku || '', price: p.price || '', stock: p.stockQuantity ?? p.stock ?? 0,
      description: p.description || '', shortDescription: p.shortDescription || '', active: p.active, featured: p.featured,
      isUsed: p.isUsed || false, condition: p.condition || 'new',
      manufactureYear: p.manufactureYear || '', inventoryNo: p.inventoryNo || '',
      images: Array.isArray(p.images) ? p.images : [],
      specs: rawSpecs.map((s: any, i: number) => ({ label: s.label || '', value: s.value || '', unit: s.unit || '', sortOrder: i })),
    });
    setEditing(p);
    setTab('basic');
  };

  const tabLabel: Record<Tab, string> = {
    basic: 'Основное',
    specs: `Характеристики${form.specs.length ? ` (${form.specs.length})` : ''}`,
    photos: `Фото${form.images.length ? ` (${form.images.length})` : ''}`,
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex gap-3 flex-col sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по названию, артикулу..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <button onClick={() => { setForm(emptyForm); setCreating(true); setTab('basic'); }}
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
                      <div className="flex items-center gap-3">
                        {Array.isArray(p.images) && p.images[0] && (
                          <img src={p.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        )}
                        <div>
                          <div className="font-medium text-sm text-gray-900">{p.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {p.isUsed && <span className="text-xs text-orange-600 font-medium">Б/у</span>}
                            {Array.isArray(p.specifications) && p.specifications.length > 0 && (
                              <span className="text-xs text-gray-400">{p.specifications.length} характ.</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{p.sku || '—'}</td>
                    <td className="px-6 py-4 text-sm font-medium">{p.price ? `${Number(p.price).toLocaleString('ru-RU')} ₽` : '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.stockQuantity ?? p.stock ?? '—'}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleActive(p)}
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
          <div className="flex border-b border-gray-100">
            {(['basic', 'specs', 'photos'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {tabLabel[t]}
              </button>
            ))}
          </div>

          <div className="px-6 py-4 space-y-4">
            {tab === 'basic' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <F label="Название *">
                    <input value={form.name}
                      onChange={e => setForm((f: any) => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))}
                      className={inputCls} placeholder="Весло туристическое" />
                  </F>
                  <F label="Слаг">
                    <input value={form.slug} onChange={e => setForm((f: any) => ({ ...f, slug: e.target.value }))} className={inputCls} />
                  </F>
                  <F label="Артикул (SKU)">
                    <input value={form.sku} onChange={e => setForm((f: any) => ({ ...f, sku: e.target.value }))} className={inputCls} placeholder="SKU-001" />
                  </F>
                  <F label="Цена (₽) *">
                    <input type="number" value={form.price} onChange={e => setForm((f: any) => ({ ...f, price: e.target.value }))} className={inputCls} placeholder="2500" />
                  </F>
                  <F label="Остаток">
                    <input type="number" value={form.stock} onChange={e => setForm((f: any) => ({ ...f, stock: +e.target.value }))} className={inputCls} />
                  </F>
                  <F label="Состояние">
                    <select value={form.condition} onChange={e => setForm((f: any) => ({ ...f, condition: e.target.value }))} className={inputCls}>
                      {CONDITION_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </F>
                  <F label="Год производства">
                    <input type="number" value={form.manufactureYear}
                      onChange={e => setForm((f: any) => ({ ...f, manufactureYear: e.target.value }))}
                      className={inputCls} placeholder="2022" min="2000" max="2030" />
                  </F>
                  <F label="Инвентарный №">
                    <input value={form.inventoryNo} onChange={e => setForm((f: any) => ({ ...f, inventoryNo: e.target.value }))} className={inputCls} placeholder="INV-001" />
                  </F>
                </div>
                <F label="Краткое описание">
                  <input value={form.shortDescription} onChange={e => setForm((f: any) => ({ ...f, shortDescription: e.target.value }))} className={inputCls} />
                </F>
                <F label="Описание">
                  <textarea value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
                    className={inputCls + ' resize-none'} rows={3} />
                </F>
                <div className="flex gap-6 flex-wrap">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.active} onChange={e => setForm((f: any) => ({ ...f, active: e.target.checked }))} className="rounded" />
                    Активен
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.featured} onChange={e => setForm((f: any) => ({ ...f, featured: e.target.checked }))} className="rounded" />
                    Рекомендуемый
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.isUsed}
                      onChange={e => setForm((f: any) => ({ ...f, isUsed: e.target.checked, condition: e.target.checked ? 'good' : 'new' }))}
                      className="rounded" />
                    Б/у
                  </label>
                </div>
              </>
            )}

            {tab === 'specs' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">Добавьте технические характеристики товара — они будут отображаться на странице товара.</p>
                <SpecEditor specs={form.specs} onChange={specs => setForm((f: any) => ({ ...f, specs }))} />
                {form.specs.length > 0 && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Предпросмотр</p>
                    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                      {form.specs.filter((s: SpecRow) => s.label && s.value).map((s: SpecRow, i: number) => (
                        <div key={i} className={`flex items-center justify-between px-3 py-2 text-sm ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${i < form.specs.filter((x: SpecRow) => x.label && x.value).length - 1 ? 'border-b border-gray-100' : ''}`}>
                          <span className="text-gray-500">{s.label}</span>
                          <span className="font-semibold text-gray-900">{s.value}{s.unit ? <span className="font-normal text-gray-400 ml-1">{s.unit}</span> : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'photos' && (
              <ImageUpload
                images={form.images}
                onChange={imgs => setForm((f: any) => ({ ...f, images: imgs }))}
                folder="sale-products"
                maxImages={8}
                label="Фотографии товара"
              />
            )}
          </div>

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
        <Modal title="Удалить товар?" onClose={() => setDeletingId(null)}>
          <div className="px-6 py-4"><p className="text-sm text-gray-600">Это действие нельзя отменить. Все данные товара будут удалены.</p></div>
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
