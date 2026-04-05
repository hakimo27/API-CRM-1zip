import { Plus, Trash2, GripVertical } from 'lucide-react';

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

  return (
    <div className="space-y-2">
      {specs.length === 0 && (
        <div className="text-center py-6 text-sm text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          Нет характеристик. Нажмите «Добавить» или выберите шаблон.
        </div>
      )}
      {specs.map((spec, idx) => (
        <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2">
          <div className="flex flex-col gap-0.5 text-gray-300 flex-shrink-0">
            <button type="button" onClick={() => moveUp(idx)} disabled={idx === 0}
              className="p-0.5 hover:text-gray-600 disabled:opacity-30 text-xs leading-none">▲</button>
            <GripVertical className="w-3.5 h-3.5 mx-auto" />
            <button type="button" onClick={() => moveDown(idx)} disabled={idx === specs.length - 1}
              className="p-0.5 hover:text-gray-600 disabled:opacity-30 text-xs leading-none">▼</button>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-2">
            <input
              value={spec.label}
              onChange={e => update(idx, 'label', e.target.value)}
              placeholder="Название (Вес, Длина...)"
              className="px-2.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={spec.value}
              onChange={e => update(idx, 'value', e.target.value)}
              placeholder="Значение (0.9, 320...)"
              className="px-2.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={spec.unit}
              onChange={e => update(idx, 'unit', e.target.value)}
              placeholder="Единица (кг, см, л...)"
              className="px-2.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button type="button" onClick={() => remove(idx)}
            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={add}
        className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline font-medium mt-1">
        <Plus className="w-4 h-4" /> Добавить характеристику
      </button>
    </div>
  );
}
