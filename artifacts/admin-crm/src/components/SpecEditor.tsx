import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

export interface SpecRow {
  label: string;
  value: string;
  unit: string;
  sortOrder: number;
}

interface Props {
  specs: SpecRow[];
  onChange: (specs: SpecRow[]) => void;
}

export default function SpecEditor({ specs, onChange }: Props) {
  const add = () => {
    onChange([...specs, { label: '', value: '', unit: '', sortOrder: specs.length }]);
  };

  const remove = (idx: number) => {
    onChange(specs.filter((_, i) => i !== idx).map((s, i) => ({ ...s, sortOrder: i })));
  };

  const update = (idx: number, field: keyof SpecRow, val: string | number) => {
    onChange(specs.map((s, i) => i === idx ? { ...s, [field]: val } : s));
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...specs];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next.map((s, i) => ({ ...s, sortOrder: i })));
  };

  const moveDown = (idx: number) => {
    if (idx === specs.length - 1) return;
    const next = [...specs];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next.map((s, i) => ({ ...s, sortOrder: i })));
  };

  const inp = 'px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full';

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="grid bg-gray-50 border-b border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide"
        style={{ gridTemplateColumns: '28px 1fr 160px 80px 36px' }}>
        <span />
        <span>Название характеристики</span>
        <span>Значение</span>
        <span>Ед. изм.</span>
        <span />
      </div>

      {specs.length === 0 && (
        <div className="text-center py-8 text-sm text-gray-400 bg-white">
          Нет характеристик — нажмите «Добавить» или выберите шаблон выше
        </div>
      )}

      {specs.map((spec, idx) => (
        <div
          key={idx}
          className="grid items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-b-0 bg-white hover:bg-gray-50/60 transition-colors"
          style={{ gridTemplateColumns: '28px 1fr 160px 80px 36px' }}
        >
          {/* Reorder controls */}
          <div className="flex flex-col items-center gap-0.5">
            <button type="button" onClick={() => moveUp(idx)} disabled={idx === 0}
              className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors">
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <GripVertical className="w-3.5 h-3.5 text-gray-300" />
            <button type="button" onClick={() => moveDown(idx)} disabled={idx === specs.length - 1}
              className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors">
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <input
            value={spec.label}
            onChange={e => update(idx, 'label', e.target.value)}
            placeholder="Например: Длина"
            className={inp}
          />
          <input
            value={spec.value}
            onChange={e => update(idx, 'value', e.target.value)}
            placeholder="320"
            className={inp}
          />
          <input
            value={spec.unit}
            onChange={e => update(idx, 'unit', e.target.value)}
            placeholder="см"
            className={inp}
          />

          <button type="button" onClick={() => remove(idx)}
            className="flex items-center justify-center p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      {/* Footer */}
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
        <button type="button" onClick={add}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
          <Plus className="w-4 h-4" /> Добавить характеристику
        </button>
      </div>
    </div>
  );
}
