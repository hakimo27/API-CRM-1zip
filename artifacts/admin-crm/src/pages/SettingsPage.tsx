import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Settings, Loader2, Save } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Setting {
  id: number; key: string; value: string; type: string; description: string | null; group: string;
}

export default function SettingsPage() {
  const qc = useQueryClient();

  const { data: settings = [], isLoading } = useQuery<Setting[]>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const initial: Record<string, string> = {};
    settings.forEach(s => { initial[s.key] = s.value; });
    setForm(initial);
  }, [settings]);

  const updateSetting = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      api.patch(`/settings/${key}`, { value }),
    onSuccess: (_, { key }) => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      setSaved(p => ({ ...p, [key]: true }));
      setTimeout(() => setSaved(p => ({ ...p, [key]: false })), 2000);
    },
  });

  const groups = [...new Set(settings.map(s => s.group))];

  const groupLabels: Record<string, string> = {
    general: 'Основные', contact: 'Контакты', notifications: 'Уведомления',
    telegram: 'Telegram', payment: 'Оплата', delivery: 'Доставка',
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (settings.length === 0) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
      <Settings className="w-16 h-16 mx-auto mb-4 opacity-20" />
      <p>Настройки не загружены</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      {groups.map(group => {
        const groupSettings = settings.filter(s => s.group === group);
        return (
          <div key={group} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-900">{groupLabels[group] || group}</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {groupSettings.map(setting => (
                <div key={setting.key} className="px-6 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{setting.description || setting.key}</div>
                    <div className="text-xs text-gray-400 font-mono mt-0.5">{setting.key}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {setting.type === 'boolean' ? (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox"
                          checked={form[setting.key] === 'true'}
                          onChange={e => {
                            const value = e.target.checked ? 'true' : 'false';
                            setForm(p => ({ ...p, [setting.key]: value }));
                            updateSetting.mutate({ key: setting.key, value });
                          }}
                          className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                      </label>
                    ) : (
                      <>
                        <input
                          type={setting.type === 'number' ? 'number' : 'text'}
                          value={form[setting.key] ?? ''}
                          onChange={e => setForm(p => ({ ...p, [setting.key]: e.target.value }))}
                          className="w-64 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => updateSetting.mutate({ key: setting.key, value: form[setting.key] })}
                          disabled={updateSetting.isPending || form[setting.key] === setting.value}
                          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {saved[setting.key] ? '✓' : <Save className="w-3.5 h-3.5" />}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
