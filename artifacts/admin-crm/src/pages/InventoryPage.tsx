import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Package, RefreshCw, Plus, X, Save, Search } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const CONDITION_LABELS: Record<string, string> = {
  excellent: 'Отличное', good: 'Хорошее', fair: 'Удовлетворительное', poor: 'Плохое',
};
const CONDITION_COLOR: Record<string, string> = {
  excellent: 'text-green-600', good: 'text-blue-600', fair: 'text-yellow-600', poor: 'text-red-600',
};
const STATUS_LABELS: Record<string, string> = {
  available: 'Доступен', rented: 'В аренде', maintenance: 'Обслуживание', written_off: 'Списан',
};
const STATUS_BADGE: Record<string, string> = {
  available: 'bg-green-100 text-green-700', rented: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-yellow-100 text-yellow-700', written_off: 'bg-red-100 text-red-600',
};

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

const emptyForm = {
  productId: '',
  inventoryNumber: '',
  serialNumber: '',
  condition: 'good',
  status: 'available',
  location: '',
  notes: '',
};

function Modal({ title, onClose, onSave, saving, children }: {
  title: string; onClose: () => void; onSave: () => void; saving: boolean; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">{children}</div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-white rounded-b-2xl">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            Отмена
          </button>
          <button onClick={onSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <Save className="w-4 h-4" />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function InventoryPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);

  const { data: inventory = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['inventory'],
    queryFn: () => api.get('/inventory'),
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['products-admin'],
    queryFn: () => api.get('/products/admin'),
  });

  const filtered = inventory.filter(item => {
    const matchStatus = !statusFilter || item.status === statusFilter;
    const matchSearch = !search
      || item.product?.name?.toLowerCase().includes(search.toLowerCase())
      || item.productName?.toLowerCase().includes(search.toLowerCase())
      || item.name?.toLowerCase().includes(search.toLowerCase())
      || item.serialNumber?.toLowerCase().includes(search.toLowerCase())
      || item.inventoryNumber?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const stats = {
    total: inventory.length,
    available: inventory.filter(i => i.status === 'available').length,
    rented: inventory.filter(i => i.status === 'rented').length,
    maintenance: inventory.filter(i => i.status === 'maintenance').length,
  };

  const sf = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const createMut = useMutation({
    mutationFn: (data: any) => api.post('/inventory', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast({ title: 'Единица инвентаря добавлена' });
      setCreating(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/inventory/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast({ title: 'Сохранено' });
      setEditingItem(null);
    },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const quickStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/inventory/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });

  const toPayload = (f: any) => ({
    productId: Number(f.productId),
    inventoryNumber: f.inventoryNumber || undefined,
    serialNumber: f.serialNumber || undefined,
    condition: f.condition,
    status: f.status,
    location: f.location || undefined,
    notes: f.notes || undefined,
  });

  const openCreate = () => {
    setForm(emptyForm);
    setCreating(true);
  };

  const openEdit = (item: any) => {
    setForm({
      productId: String(item.productId || ''),
      inventoryNumber: item.inventoryNumber || '',
      serialNumber: item.serialNumber || '',
      condition: item.condition || 'good',
      status: item.status || 'available',
      location: item.location || '',
      notes: item.notes || '',
    });
    setEditingItem(item);
  };

  const FormContent = () => (
    <>
      <F label="Товар *">
        <select value={form.productId} onChange={e => sf('productId', e.target.value)} className={inputCls}>
          <option value="">— выбрать товар —</option>
          {products.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </F>
      <div className="grid grid-cols-2 gap-3">
        <F label="Инвентарный номер">
          <input value={form.inventoryNumber} onChange={e => sf('inventoryNumber', e.target.value)}
            className={inputCls} placeholder="INV-001" />
        </F>
        <F label="Серийный номер">
          <input value={form.serialNumber} onChange={e => sf('serialNumber', e.target.value)}
            className={inputCls} placeholder="SN-12345" />
        </F>
        <F label="Состояние">
          <select value={form.condition} onChange={e => sf('condition', e.target.value)} className={inputCls}>
            {Object.entries(CONDITION_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </F>
        <F label="Статус">
          <select value={form.status} onChange={e => sf('status', e.target.value)} className={inputCls}>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </F>
      </div>
      <F label="Место хранения / филиал">
        <input value={form.location} onChange={e => sf('location', e.target.value)}
          className={inputCls} placeholder="Склад А, шкаф 3" />
      </F>
      <F label="Комментарий">
        <textarea value={form.notes} onChange={e => sf('notes', e.target.value)}
          className={inputCls + ' resize-none'} rows={2}
          placeholder="Царапины, ремонт, примечания..." />
      </F>
    </>
  );

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Всего единиц', value: stats.total, color: 'bg-gray-100 text-gray-700' },
          { label: 'Доступно', value: stats.available, color: 'bg-green-100 text-green-700' },
          { label: 'В аренде', value: stats.rented, color: 'bg-blue-100 text-blue-700' },
          { label: 'Обслуживание', value: stats.maintenance, color: 'bg-yellow-100 text-yellow-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-4 text-center ${s.color}`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters + Add */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по товару, серийному, инв. номеру..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Все статусы</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button onClick={() => refetch()} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Добавить единицу
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Инвентарь</h2>
          <span className="text-sm text-gray-400">{filtered.length} ед.</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="mb-4">Инвентарь пуст или не соответствует фильтрам</p>
            <button onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Добавить первую единицу
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Товар</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Инв. №</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Серийный №</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Состояние</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Расположение</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-sm text-gray-900">
                        {item.product?.name || item.productName || item.name || `Товар #${item.productId}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-500">{item.inventoryNumber || '—'}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-500">{item.serialNumber || '—'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={CONDITION_COLOR[item.condition] || 'text-gray-500'}>
                        {CONDITION_LABELS[item.condition] || item.condition || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.location || '—'}</td>
                    <td className="px-6 py-4">
                      <select
                        value={item.status}
                        onChange={e => quickStatusMut.mutate({ id: item.id, status: e.target.value })}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 ${STATUS_BADGE[item.status] || 'bg-gray-100 text-gray-700'}`}>
                        {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => openEdit(item)}
                        className="text-xs text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors font-medium">
                        Изменить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {creating && (
        <Modal
          title="Добавить единицу инвентаря"
          onClose={() => { setCreating(false); setForm(emptyForm); }}
          onSave={() => {
            if (!form.productId) return;
            createMut.mutate(toPayload(form));
          }}
          saving={createMut.isPending}
        >
          <FormContent />
        </Modal>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <Modal
          title={`Изменить: ${editingItem.productName || editingItem.name || `#${editingItem.id}`}`}
          onClose={() => setEditingItem(null)}
          onSave={() => updateMut.mutate({ id: editingItem.id, data: toPayload(form) })}
          saving={updateMut.isPending}
        >
          <FormContent />
        </Modal>
      )}
    </div>
  );
}
