import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Tag, ExternalLink, Search, Plus, Edit, Trash2, X, Save, ChevronDown, ChevronUp } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import { useState, useEffect, useCallback } from 'react';

const DOMAIN_SCOPE_LABELS: Record<string, string> = {
  rental: 'Аренда', sale: 'Продажа', both: 'Аренда + Продажа',
  tour_related: 'Туры', info_related: 'Инфо',
};
const DOMAIN_SCOPE_COLORS: Record<string, string> = {
  rental: 'bg-blue-100 text-blue-700', sale: 'bg-green-100 text-green-700',
  both: 'bg-purple-100 text-purple-700', tour_related: 'bg-orange-100 text-orange-700',
  info_related: 'bg-gray-100 text-gray-600',
};
const TARIFF_TYPES = [
  { value: 'weekday', label: 'Будни' },
  { value: 'weekend', label: 'Выходные' },
  { value: 'week', label: 'Неделя' },
  { value: 'may_holidays', label: 'Майские' },
];

type Tariff = { id?: number; type: string; label: string; pricePerDay: string; minDays: string };
type ProductForm = {
  name: string; slug: string; sku: string; categoryId: string;
  domainScope: string; shortDescription: string; fullDescription: string;
  active: boolean; featured: boolean; depositAmount: string; badge: string;
  totalStock: string;
  metaTitle: string; metaDescription: string; ogTitle: string; ogDescription: string; canonicalUrl: string;
  tariffs: Tariff[];
  images: string[];
};

const EMPTY_FORM: ProductForm = {
  name: '', slug: '', sku: '', categoryId: '', domainScope: 'rental',
  shortDescription: '', fullDescription: '', active: true, featured: false,
  depositAmount: '', badge: '', totalStock: '0',
  metaTitle: '', metaDescription: '', ogTitle: '', ogDescription: '', canonicalUrl: '',
  tariffs: [{ type: 'weekday', label: 'Будни', pricePerDay: '', minDays: '1' }],
  images: [],
};

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9а-яё\s-]/gi, '').replace(/[а-яё]/g, c => {
    const map: Record<string, string> = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'j',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
    return map[c] || c;
  }).replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

type ModalTab = 'basic' | 'tariffs' | 'photos' | 'seo';

export default function ProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [modalTab, setModalTab] = useState<ModalTab>('basic');
  const [slugManual, setSlugManual] = useState(false);
  const [formError, setFormError] = useState('');

  const { data: products = [], isLoading } = useQuery<any[]>({
    queryKey: ['products-admin'],
    queryFn: () => api.get('/products/admin'),
  });
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories'),
  });

  const filtered = products.filter(p => {
    if (categoryFilter && p.categoryId !== Number(categoryFilter)) return false;
    if (scopeFilter && p.domainScope !== scopeFilter) return false;
    if (activeFilter === 'active' && p.active === false) return false;
    if (activeFilter === 'inactive' && p.active !== false) return false;
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase()) && !p.sku?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditProduct(null);
    setSlugManual(false);
    setModalTab('basic');
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (p: any) => {
    setForm({
      name: p.name || '', slug: p.slug || '', sku: p.sku || '',
      categoryId: String(p.categoryId || ''), domainScope: p.domainScope || 'rental',
      shortDescription: p.shortDescription || '', fullDescription: p.fullDescription || '',
      active: p.active !== false, featured: !!p.featured,
      depositAmount: String(p.depositAmount || ''), badge: p.badge || '',
      totalStock: String(p.totalStock ?? 0),
      metaTitle: p.metaTitle || '', metaDescription: p.metaDescription || '',
      ogTitle: p.ogTitle || '', ogDescription: p.ogDescription || '',
      canonicalUrl: p.canonicalUrl || '',
      tariffs: p.tariffs?.length
        ? p.tariffs.map((t: any) => ({ id: t.id, type: t.type, label: t.label, pricePerDay: String(t.pricePerDay || ''), minDays: String(t.minDays || '1') }))
        : [{ type: 'weekday', label: 'Будни', pricePerDay: '', minDays: '1' }],
      images: Array.isArray(p.images) ? p.images.map((img: any) => typeof img === 'string' ? img : img.url) : [],
    });
    setEditProduct(p);
    setSlugManual(true);
    setModalTab('basic');
    setFormError('');
    setModalOpen(true);
  };

  useEffect(() => {
    if (!slugManual && form.name && !editProduct) {
      setForm(f => ({ ...f, slug: slugify(f.name) }));
    }
  }, [form.name, slugManual, editProduct]);

  const setField = useCallback(<K extends keyof ProductForm>(k: K, v: ProductForm[K]) => {
    setForm(f => ({ ...f, [k]: v }));
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Введите название товара');
      if (!form.categoryId) throw new Error('Выберите категорию');
      const payload = {
        name: form.name, slug: form.slug, sku: form.sku || undefined,
        categoryId: Number(form.categoryId), domainScope: form.domainScope,
        shortDescription: form.shortDescription || undefined,
        fullDescription: form.fullDescription || undefined,
        active: form.active, featured: form.featured,
        depositAmount: form.depositAmount ? form.depositAmount : undefined,
        badge: form.badge || undefined,
        totalStock: Number(form.totalStock) || 0,
        metaTitle: form.metaTitle || undefined, metaDescription: form.metaDescription || undefined,
        ogTitle: form.ogTitle || undefined, ogDescription: form.ogDescription || undefined,
        canonicalUrl: form.canonicalUrl || undefined,
        tariffs: form.tariffs.filter(t => t.pricePerDay).map(t => ({
          type: t.type, label: t.label,
          pricePerDay: t.pricePerDay, minDays: t.minDays ? Number(t.minDays) : null,
        })),
      };
      let saved: any;
      if (editProduct) saved = await api.patch(`/products/${editProduct.id}`, payload);
      else saved = await api.post('/products', payload);
      const productId = saved?.id || editProduct?.id;
      if (productId) {
        await api.patch(`/products/${productId}/images`, { urls: form.images });
      }
      return saved;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products-admin'] });
      setModalOpen(false);
    },
    onError: (err: any) => setFormError(err.message || 'Ошибка сохранения'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products-admin'] }); setDeleteId(null); },
  });

  return (
    <div className="space-y-4">
      {/* Filters + Add */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по названию, SKU..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Все категории</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={scopeFilter} onChange={e => setScopeFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Все витрины</option>
            {Object.entries(DOMAIN_SCOPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={activeFilter} onChange={e => setActiveFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Любой статус</option>
            <option value="active">Активные</option>
            <option value="inactive">Скрытые</option>
          </select>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Добавить товар
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Товары</h2>
          <span className="text-sm text-gray-400">{filtered.length} из {products.length}</span>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="mb-4">Товары не найдены</p>
            <button onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Добавить первый товар
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="px-6 py-3">Название</th>
                  <th className="px-6 py-3">SKU</th>
                  <th className="px-6 py-3">Категория</th>
                  <th className="px-6 py-3">Витрина</th>
                  <th className="px-6 py-3">Цена/день</th>
                  <th className="px-6 py-3">Склад</th>
                  <th className="px-6 py-3">Статус</th>
                  <th className="px-6 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p: any) => {
                  const minPrice = p.tariffs?.length ? Math.min(...p.tariffs.map((t: any) => Number(t.pricePerDay))) : null;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-sm text-gray-900">{p.name}</div>
                        {p.badge && <span className="text-xs text-blue-600 font-medium">{p.badge}</span>}
                        <div className="text-xs text-gray-400 font-mono">{p.slug}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-400">{p.sku || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{categories.find((c: any) => c.id === p.categoryId)?.name || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DOMAIN_SCOPE_COLORS[p.domainScope] || 'bg-gray-100 text-gray-600'}`}>
                          {DOMAIN_SCOPE_LABELS[p.domainScope] || p.domainScope || 'rental'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {minPrice ? `от ${minPrice.toLocaleString('ru-RU')} ₽` : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {(p.totalStock ?? 0) > 0
                          ? <span className="font-medium text-gray-900">{p.totalStock}</span>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {p.active !== false ? 'Активен' : 'Скрыт'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <a href={`/catalog/${p.slug}`} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Открыть на сайте">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button onClick={() => openEdit(p)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteId(p.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Удалить товар?</h3>
            <p className="text-sm text-gray-500 mb-6">Это действие нельзя отменить. Все связанные данные будут удалены.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                Отмена
              </button>
              <button onClick={() => deleteMutation.mutate(deleteId!)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {deleteMutation.isPending ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-xl my-8">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editProduct ? `Редактировать: ${editProduct.name}` : 'Новый товар'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-gray-100">
              {(['basic', 'tariffs', 'photos', 'seo'] as const).map(tab => (
                <button key={tab} onClick={() => setModalTab(tab)}
                  className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    modalTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  {tab === 'basic' ? 'Основное' : tab === 'tariffs' ? 'Тарифы' : tab === 'photos' ? `Фото (${form.images.length})` : 'SEO'}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{formError}</div>
              )}

              {/* Basic Tab */}
              {modalTab === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Название *</label>
                      <input value={form.name} onChange={e => setField('name', e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Байдарка Щука 2" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Slug (URL)</label>
                      <input value={form.slug}
                        onChange={e => { setSlugManual(true); setField('slug', e.target.value); }}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="baidarka-schuka-2" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Артикул (SKU)</label>
                      <input value={form.sku} onChange={e => setField('sku', e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="KYK-001" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Категория *</label>
                      <select value={form.categoryId} onChange={e => setField('categoryId', e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">— выбрать —</option>
                        {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Где показывать</label>
                      <select value={form.domainScope} onChange={e => setField('domainScope', e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {Object.entries(DOMAIN_SCOPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Залог (₽)</label>
                      <input type="number" value={form.depositAmount} onChange={e => setField('depositAmount', e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="5000" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Общий склад (кол-во ед.)
                        <span className="ml-1 text-gray-400 font-normal">— всего единиц товара</span>
                      </label>
                      <input type="number" min="0" value={form.totalStock} onChange={e => setField('totalStock', e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="10" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Бейдж</label>
                      <input value={form.badge} onChange={e => setField('badge', e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Хит, Новинка..." />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Краткое описание</label>
                      <textarea value={form.shortDescription} onChange={e => setField('shortDescription', e.target.value)}
                        rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Краткое описание товара..." />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Полное описание</label>
                      <textarea value={form.fullDescription} onChange={e => setField('fullDescription', e.target.value)}
                        rows={4} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Подробное описание..." />
                    </div>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={form.active} onChange={e => setField('active', e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600" />
                        Активен
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={form.featured} onChange={e => setField('featured', e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600" />
                        Рекомендуемый
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Tariffs Tab */}
              {modalTab === 'tariffs' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Укажите тарифы для товара (цена за день)</p>
                    <button
                      onClick={() => setForm(f => ({ ...f, tariffs: [...f.tariffs, { type: 'weekday', label: 'Новый тариф', pricePerDay: '', minDays: '1' }] }))}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium">
                      <Plus className="w-3.5 h-3.5" /> Добавить тариф
                    </button>
                  </div>
                  {form.tariffs.map((tariff, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">Тариф #{idx + 1}</span>
                        {form.tariffs.length > 1 && (
                          <button onClick={() => setForm(f => ({ ...f, tariffs: f.tariffs.filter((_, i) => i !== idx) }))}
                            className="text-red-400 hover:text-red-600">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Тип</label>
                          <select value={tariff.type}
                            onChange={e => {
                              const t = TARIFF_TYPES.find(tt => tt.value === e.target.value);
                              setForm(f => ({ ...f, tariffs: f.tariffs.map((tr, i) => i === idx ? { ...tr, type: e.target.value, label: t?.label || tr.label } : tr) }));
                            }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                            {TARIFF_TYPES.map(tt => <option key={tt.value} value={tt.value}>{tt.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Название тарифа</label>
                          <input value={tariff.label}
                            onChange={e => setForm(f => ({ ...f, tariffs: f.tariffs.map((tr, i) => i === idx ? { ...tr, label: e.target.value } : tr) }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Будни" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Цена/день (₽)</label>
                          <input type="number" value={tariff.pricePerDay}
                            onChange={e => setForm(f => ({ ...f, tariffs: f.tariffs.map((tr, i) => i === idx ? { ...tr, pricePerDay: e.target.value } : tr) }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="1500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Мин. дней</label>
                          <input type="number" value={tariff.minDays}
                            onChange={e => setForm(f => ({ ...f, tariffs: f.tariffs.map((tr, i) => i === idx ? { ...tr, minDays: e.target.value } : tr) }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="1" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Photos Tab */}
              {modalTab === 'photos' && (
                <div>
                  {!editProduct && (
                    <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                      Сначала сохраните товар, затем добавьте фотографии.
                    </div>
                  )}
                  <ImageUpload
                    images={form.images}
                    onChange={imgs => setField('images', imgs)}
                    folder="products"
                    maxImages={10}
                    label="Фотографии товара"
                  />
                </div>
              )}

              {/* SEO Tab */}
              {modalTab === 'seo' && (
                <div className="space-y-4">
                  {[
                    { key: 'metaTitle', label: 'Meta Title', placeholder: 'SEO заголовок (до 70 симв.)' },
                    { key: 'metaDescription', label: 'Meta Description', placeholder: 'SEO описание (до 160 симв.)', multi: true },
                    { key: 'ogTitle', label: 'OG Title', placeholder: 'Заголовок для соцсетей' },
                    { key: 'ogDescription', label: 'OG Description', placeholder: 'Описание для соцсетей', multi: true },
                    { key: 'canonicalUrl', label: 'Canonical URL', placeholder: 'https://...' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{f.label}</label>
                      {f.multi ? (
                        <textarea value={(form as any)[f.key]} onChange={e => setField(f.key as keyof ProductForm, e.target.value as any)}
                          rows={2} placeholder={f.placeholder}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                      ) : (
                        <input value={(form as any)[f.key]} onChange={e => setField(f.key as keyof ProductForm, e.target.value as any)}
                          placeholder={f.placeholder}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                Отмена
              </button>
              <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                <Save className="w-4 h-4" />
                {saveMutation.isPending ? 'Сохранение...' : editProduct ? 'Сохранить' : 'Создать товар'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
