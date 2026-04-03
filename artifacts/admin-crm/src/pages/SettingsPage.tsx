import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Settings, Loader2, Save, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

type FlatSettings = Record<string, string | number | boolean>;

const GROUP_LABELS: Record<string, string> = {
  general: 'Основные',
  contacts: 'Контакты',
  booking: 'Бронирование',
  notifications: 'Уведомления',
  telegram: 'Telegram',
  payment: 'Оплата',
};

const SETTING_LABELS: Record<string, string> = {
  'general.company_name': 'Название компании',
  'general.company_slogan': 'Слоган',
  'contacts.phone': 'Телефон',
  'contacts.email': 'Email',
  'contacts.address': 'Адрес',
  'booking.min_rental_hours': 'Минимум часов аренды',
  'booking.deposit_required': 'Требовать залог',
  'booking.advance_booking_days': 'Предварительное бронирование (дней)',
  'telegram.bot_enabled': 'Telegram бот включён',
  'notifications.email_on_order': 'Email при новом заказе',
  'notifications.telegram_on_order': 'Telegram при новом заказе',
};

function getGroup(key: string) {
  return key.split('.')[0] || 'general';
}

function isBoolean(value: unknown): boolean {
  return typeof value === 'boolean' || value === 'true' || value === 'false';
}

function isNumber(value: unknown, key: string): boolean {
  return typeof value === 'number' || ['min_rental_hours', 'advance_booking_days'].some(k => key.endsWith(k));
}

export default function SettingsPage() {
  const qc = useQueryClient();

  const { data: rawSettings, isLoading } = useQuery<FlatSettings>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
  });

  const [form, setForm] = useState<FlatSettings>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (rawSettings) setForm(rawSettings);
  }, [rawSettings]);

  const updateSetting = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      api.put(`/settings/${key}`, { value, group: getGroup(key) }),
    onSuccess: (_: unknown, { key }: { key: string; value: unknown }) => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      setSaved(p => ({ ...p, [key]: true }));
      setTimeout(() => setSaved(p => ({ ...p, [key]: false })), 2000);
    },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const keys = Object.keys(form);
  if (keys.length === 0) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
      <Settings className="w-16 h-16 mx-auto mb-4 opacity-20" />
      <p className="mb-4">Настройки не загружены</p>
      <button
        onClick={() => api.post('/settings/init', {}).then(() => qc.invalidateQueries({ queryKey: ['settings'] }))}
        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
      >
        Инициализировать настройки
      </button>
    </div>
  );

  const groups = [...new Set(keys.map(getGroup))];

  return (
    <div className="space-y-6 max-w-3xl">
      {groups.map(group => {
        const groupKeys = keys.filter(k => getGroup(k) === group);
        return (
          <div key={group} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-900">{GROUP_LABELS[group] || group}</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {groupKeys.map(key => {
                const value = form[key];
                const isBool = isBoolean(value);
                const isNum = isNumber(value, key);
                const label = SETTING_LABELS[key] || key.split('.')[1]?.replace(/_/g, ' ') || key;
                const boolValue = value === true || value === 'true';

                return (
                  <div key={key} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{label}</div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5">{key}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isBool ? (
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox"
                            checked={boolValue}
                            onChange={e => {
                              const next = e.target.checked;
                              setForm(p => ({ ...p, [key]: next }));
                              updateSetting.mutate({ key, value: next });
                            }}
                            className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                        </label>
                      ) : (
                        <>
                          <input
                            type={isNum ? 'number' : 'text'}
                            value={String(value ?? '')}
                            onChange={e => {
                              const next = isNum ? Number(e.target.value) : e.target.value;
                              setForm(p => ({ ...p, [key]: next }));
                            }}
                            className="w-56 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => updateSetting.mutate({ key, value: form[key] })}
                            disabled={updateSetting.isPending}
                            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            {saved[key] ? <CheckCircle className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
