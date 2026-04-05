import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Plus, Edit, Trash2, X, Save, Layers, FileText } from 'lucide-react';
import { useState } from 'react';
import SpecEditor, { type SpecRow } from '@/components/SpecEditor';

const TARIFF_TYPES = [
  { value: 'weekday', label: 'Будни' },
  { value: 'weekend', label: 'Выходные' },
  { value: 'week', label: 'Неделя' },
  { value: 'may_holidays', label: 'Майские' },
];

type TariffRow = { type: string; label: string; pricePerDay: string; minDays: string };

type Tab = 'spec' | 'tariff';

export default function TemplatesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('tariff');

  const { data: specTemplates = [] } = useQuery<any[]>({
    queryKey: ['spec-templates'],
    queryFn: () => api.get('/templates/spec-templates'),
  });
  const { data: tariffTemplates = [] } = useQuery<any[]>({
    queryKey: ['tariff-templates'],
    queryFn: () => api.get('/templates/tariff-templates'),
  });

  const [specModal, setSpecModal] = useState(false);
  const [editSpec, setEditSpec] = useState<any>(null);
  const [specForm, setSpecForm] = useState<{ name: string; specs: SpecRow[] }>({ name: '', specs: [] });

  const [tariffModal, setTariffModal] = useState(false);
  const [editTariff, setEditTariff] = useState<any>(null);
  const [tariffForm, setTariffForm] = useState<{ name: string; tariffs: TariffRow[] }>({
    name: '',
    tariffs: [
      { type: 'weekday', label: 'Будни', pricePerDay: '', minDays: '1' },
      { type: 'weekend', label: 'Выходные', pricePerDay: '', minDays: '1' },
      { type: 'week', label: 'Неделя', pricePerDay: '', minDays: '7' },
    ],
  });

  const openCreateSpec = () => {
    setEditSpec(null);
    setSpecForm({ name: '', specs: [] });
    setSpecModal(true);
  };
  const openEditSpec = (t: any) => {
    setEditSpec(t);
    setSpecForm({ name: t.name, specs: Array.isArray(t.specs) ? t.specs : [] });
    setSpecModal(true);
  };

  const openCreateTariff = () => {
    setEditTariff(null);
    setTariffForm({
      name: '',
      tariffs: [
        { type: 'weekday', label: 'Будни', pricePerDay: '', minDays: '1' },
        { type: 'weekend', label: 'Выходные', pricePerDay: '', minDays: '1' },
        { type: 'week', label: 'Неделя', pricePerDay: '', minDays: '7' },
      ],
    });
    setTariffModal(true);
  };
  const openEditTariff = (t: any) => {
    setEditTariff(t);
    setTariffForm({
      name: t.name,
      tariffs: Array.isArray(t.tariffs)
        ? t.tariffs.map((r: any) => ({ type: r.type, label: r.label, pricePerDay: String(r.pricePerDay || ''), minDays: String(r.minDays || '1') }))
        : [],
    });
    setTariffModal(true);
  };

  const saveSpecMut = useMutation({
    mutationFn: () => {
      const payload = { name: specForm.name, specs: specForm.specs };
      if (editSpec) return api.patch(`/templates/spec-templates/${editSpec.id}`, payload);
      return api.post('/templates/spec-templates', payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['spec-templates'] }); setSpecModal(false); },
  });

  const deleteSpecMut = useMutation({
    mutationFn: (id: number) => api.delete(`/templates/spec-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spec-templates'] }),
  });

  const saveTariffMut = useMutation({
    mutationFn: () => {
      const payload = {
        name: tariffForm.name,
        tariffs: tariffForm.tariffs.filter(t => t.pricePerDay).map(t => ({
          type: t.type, label: t.label,
          pricePerDay: t.pricePerDay, minDays: t.minDays ? Number(t.minDays) : null,
        })),
      };
      if (editTariff) return api.patch(`/templates/tariff-templates/${editTariff.id}`, payload);
      return api.post('/templates/tariff-templates', payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tariff-templates'] }); setTariffModal(false); },
  });

  const deleteTariffMut = useMutation({
    mutationFn: (id: number) => api.delete(`/templates/tariff-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tariff-templates'] }),
  });

  const updateTariffRow = (idx: number, field: keyof TariffRow, val: string) => {
    setTariffForm(f => ({ ...f, tariffs: f.tariffs.map((t, i) => i === idx ? { ...t, [field]: val } : t) }));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h1 className="text-lg font-semibold text-gray-900">Шаблоны</h1>
        <p className="text-sm text-gray-500 mt-0.5">Шаблоны тарифов и характеристик — применяются к товарам для быстрого заполнения</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {(['tariff', 'spec'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'tariff' ? <span className="flex items-center gap-2"><Layers className="w-4 h-4" /> Шаблоны тарифов</span> : <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Шаблоны характеристик</span>}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === 'tariff' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">Создайте шаблон с набором тарифов. Применяйте его к товарам за одно нажатие.</p>
                <button onClick={openCreateTariff}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                  <Plus className="w-4 h-4" /> Создать шаблон
                </button>
              </div>
              {tariffTemplates.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <Layers className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="font-medium">Нет шаблонов тарифов</p>
                  <p className="text-sm mt-1">Создайте шаблон, чтобы быстро заполнять тарифы в товарах</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {tariffTemplates.map((tmpl: any) => (
                    <div key={tmpl.id} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{tmpl.name}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">{(tmpl.tariffs || []).length} тариф(а)</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEditTariff(tmpl)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => { if (confirm('Удалить шаблон?')) deleteTariffMut.mutate(tmpl.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(tmpl.tariffs || []).map((t: any, i: number) => (
                          <div key={i} className="bg-blue-50 rounded-lg px-3 py-2 text-center">
                            <div className="text-xs text-gray-500">{t.label}</div>
                            <div className="font-semibold text-blue-700 text-sm">{t.pricePerDay ? `${Number(t.pricePerDay).toLocaleString('ru-RU')} ₽` : '—'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'spec' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">Создайте шаблон характеристик для типа товара (байдарка, SUP, весло и т.д.)</p>
                <button onClick={openCreateSpec}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                  <Plus className="w-4 h-4" /> Создать шаблон
                </button>
              </div>
              {specTemplates.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="font-medium">Нет шаблонов характеристик</p>
                  <p className="text-sm mt-1">Создайте шаблон для каждого типа товара</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {specTemplates.map((tmpl: any) => (
                    <div key={tmpl.id} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{tmpl.name}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">{(tmpl.specs || []).length} характеристик</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEditSpec(tmpl)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => { if (confirm('Удалить шаблон?')) deleteSpecMut.mutate(tmpl.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(tmpl.specs || []).map((s: any, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">
                            {s.label}{s.unit ? ` (${s.unit})` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {tariffModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{editTariff ? 'Редактировать шаблон тарифов' : 'Новый шаблон тарифов'}</h2>
              <button onClick={() => setTariffModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Название шаблона *</label>
                <input value={tariffForm.name} onChange={e => setTariffForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Базовый шаблон аренды" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-700">Тарифы</label>
                  <button type="button" onClick={() => setTariffForm(f => ({ ...f, tariffs: [...f.tariffs, { type: 'weekday', label: 'Новый тариф', pricePerDay: '', minDays: '1' }] }))}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                    <Plus className="w-3.5 h-3.5" /> Добавить
                  </button>
                </div>
                <div className="space-y-2">
                  {tariffForm.tariffs.map((t, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-xl p-3 grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Тип</label>
                        <select value={t.type} onChange={e => {
                          const tt = TARIFF_TYPES.find(x => x.value === e.target.value);
                          updateTariffRow(idx, 'type', e.target.value);
                          if (tt) updateTariffRow(idx, 'label', tt.label);
                        }} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                          {TARIFF_TYPES.map(tt => <option key={tt.value} value={tt.value}>{tt.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Название</label>
                        <input value={t.label} onChange={e => updateTariffRow(idx, 'label', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Цена/день (₽)</label>
                        <input type="number" value={t.pricePerDay} onChange={e => updateTariffRow(idx, 'pricePerDay', e.target.value)} placeholder="1500"
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Мин. дней</label>
                          <input type="number" value={t.minDays} onChange={e => updateTariffRow(idx, 'minDays', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        {tariffForm.tariffs.length > 1 && (
                          <button type="button" onClick={() => setTariffForm(f => ({ ...f, tariffs: f.tariffs.filter((_, i) => i !== idx) }))}
                            className="mt-5 p-1.5 text-red-400 hover:text-red-600">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-between">
              <button onClick={() => setTariffModal(false)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Отмена</button>
              <button onClick={() => saveTariffMut.mutate()} disabled={!tariffForm.name || saveTariffMut.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                <Save className="w-4 h-4" />
                {saveTariffMut.isPending ? 'Сохранение...' : editTariff ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {specModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{editSpec ? 'Редактировать шаблон характеристик' : 'Новый шаблон характеристик'}</h2>
              <button onClick={() => setSpecModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Название шаблона *</label>
                <input value={specForm.name} onChange={e => setSpecForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Байдарка, SUP, Весло..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Характеристики</label>
                <SpecEditor specs={specForm.specs} onChange={specs => setSpecForm(f => ({ ...f, specs }))} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-between">
              <button onClick={() => setSpecModal(false)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Отмена</button>
              <button onClick={() => saveSpecMut.mutate()} disabled={!specForm.name || saveSpecMut.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                <Save className="w-4 h-4" />
                {saveSpecMut.isPending ? 'Сохранение...' : editSpec ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
