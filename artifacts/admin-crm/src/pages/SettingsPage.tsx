import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Settings, Save, CheckCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect } from 'react';

type FlatSettings = Record<string, unknown>;

const TABS = [
  { id: 'general', label: 'Основные' },
  { id: 'contacts', label: 'Контакты' },
  { id: 'branding', label: 'Брендинг' },
  { id: 'booking', label: 'Бронирование' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'notifications', label: 'Уведомления' },
];

const FIELD_DEFS: Array<{
  key: string; group: string; label: string;
  type?: 'text' | 'number' | 'boolean' | 'password' | 'color' | 'url';
  placeholder?: string; hint?: string;
}> = [
  { key: 'general.company_name', group: 'general', label: 'Название компании', type: 'text' },
  { key: 'general.company_slogan', group: 'general', label: 'Слоган', type: 'text' },
  { key: 'general.tagline', group: 'general', label: 'Подзаголовок', type: 'text' },
  { key: 'general.site_name', group: 'general', label: 'Имя сайта (браузер)', type: 'text' },
  { key: 'general.footer_text', group: 'general', label: 'Текст подвала', type: 'text' },
  { key: 'general.copyright', group: 'general', label: 'Copyright строка', type: 'text' },

  { key: 'contacts.phone', group: 'contacts', label: 'Телефон (основной)', type: 'text', placeholder: '+7 (999) 000-00-00' },
  { key: 'contacts.phone2', group: 'contacts', label: 'Телефон (доп.)', type: 'text' },
  { key: 'contacts.email', group: 'contacts', label: 'Email', type: 'text' },
  { key: 'contacts.address', group: 'contacts', label: 'Адрес', type: 'text' },
  { key: 'contacts.city', group: 'contacts', label: 'Город', type: 'text' },
  { key: 'contacts.schedule', group: 'contacts', label: 'График работы', type: 'text' },
  { key: 'contacts.coordinates_lat', group: 'contacts', label: 'Широта (lat)', type: 'text', placeholder: '55.7558' },
  { key: 'contacts.coordinates_lng', group: 'contacts', label: 'Долгота (lng)', type: 'text', placeholder: '37.6176' },
  { key: 'contacts.telegram', group: 'contacts', label: 'Telegram username', type: 'text', placeholder: '@username' },
  { key: 'contacts.whatsapp', group: 'contacts', label: 'WhatsApp (номер)', type: 'text' },
  { key: 'contacts.vk', group: 'contacts', label: 'ВКонтакте URL', type: 'url' },
  { key: 'contacts.instagram', group: 'contacts', label: 'Instagram URL', type: 'url' },
  { key: 'contacts.youtube', group: 'contacts', label: 'YouTube URL', type: 'url' },

  { key: 'branding.logo_url', group: 'branding', label: 'URL логотипа', type: 'url' },
  { key: 'branding.favicon_url', group: 'branding', label: 'URL favicon', type: 'url' },
  { key: 'branding.primary_color', group: 'branding', label: 'Основной цвет', type: 'color' },
  { key: 'branding.og_image_url', group: 'branding', label: 'OG Image для соцсетей', type: 'url' },

  { key: 'booking.min_rental_hours', group: 'booking', label: 'Минимум часов аренды', type: 'number' },
  { key: 'booking.deposit_required', group: 'booking', label: 'Требовать залог', type: 'boolean' },
  { key: 'booking.advance_booking_days', group: 'booking', label: 'Макс. срок бронирования (дней)', type: 'number' },
  { key: 'booking.cancellation_hours', group: 'booking', label: 'Отмена без штрафа (часов до)', type: 'number' },

  { key: 'telegram.enabled', group: 'telegram', label: 'Telegram бот включён', type: 'boolean' },
  { key: 'telegram.bot_token', group: 'telegram', label: 'Bot Token', type: 'password', hint: 'Получить у @BotFather' },
  { key: 'telegram.bot_username', group: 'telegram', label: 'Bot Username', type: 'text', placeholder: '@YourBot' },
  { key: 'telegram.webhook_url', group: 'telegram', label: 'Webhook URL', type: 'url', hint: 'https://yourdomain.com/api/telegram/webhook' },
  { key: 'telegram.webhook_secret', group: 'telegram', label: 'Webhook Secret', type: 'password' },
  { key: 'telegram.manager_chat_id', group: 'telegram', label: 'Chat ID менеджера', type: 'text', hint: 'ID чата для уведомлений' },
  { key: 'telegram.manager_group_id', group: 'telegram', label: 'Group ID менеджеров', type: 'text' },
  { key: 'telegram.forum_chat_id', group: 'telegram', label: 'Forum Chat ID', type: 'text', hint: 'Используется для topics' },
  { key: 'telegram.use_forum_topics', group: 'telegram', label: 'Использовать Forum Topics', type: 'boolean' },
  { key: 'telegram.create_topic_per_order', group: 'telegram', label: 'Создавать топик на каждый заказ', type: 'boolean' },
  { key: 'telegram.orders_topic_id', group: 'telegram', label: 'Topic ID: Заказы', type: 'text' },
  { key: 'telegram.chats_topic_id', group: 'telegram', label: 'Topic ID: Чаты', type: 'text' },
  { key: 'telegram.warehouse_topic_id', group: 'telegram', label: 'Topic ID: Склад', type: 'text' },
  { key: 'telegram.payments_topic_id', group: 'telegram', label: 'Topic ID: Оплаты', type: 'text' },
  { key: 'telegram.tours_topic_id', group: 'telegram', label: 'Topic ID: Туры', type: 'text' },
  { key: 'telegram.fallback_topic_id', group: 'telegram', label: 'Fallback Topic ID', type: 'text', hint: 'Используется если целевой топик недоступен' },
  { key: 'telegram.bidirectional_sync', group: 'telegram', label: 'Двусторонняя синхронизация (сайт ↔ TG)', type: 'boolean' },
  { key: 'telegram.notify_orders', group: 'telegram', label: 'Уведомления по заказам в TG', type: 'boolean' },

  { key: 'notifications.email_on_order', group: 'notifications', label: 'Email при новом заказе', type: 'boolean' },
  { key: 'notifications.telegram_on_order', group: 'notifications', label: 'Telegram при новом заказе', type: 'boolean' },
  { key: 'notifications.email_on_register', group: 'notifications', label: 'Email при регистрации', type: 'boolean' },
  { key: 'notifications.email_host', group: 'notifications', label: 'SMTP Host', type: 'text', placeholder: 'smtp.gmail.com' },
  { key: 'notifications.email_port', group: 'notifications', label: 'SMTP Port', type: 'number', placeholder: '587' },
  { key: 'notifications.email_user', group: 'notifications', label: 'SMTP User (Login)', type: 'text' },
  { key: 'notifications.email_password', group: 'notifications', label: 'SMTP Password', type: 'password' },
  { key: 'notifications.email_from', group: 'notifications', label: 'Email отправителя', type: 'text', placeholder: 'noreply@kayakrent.ru' },
];

function FieldInput({
  field, value, onChange, onSave, saving, saved,
}: {
  field: typeof FIELD_DEFS[0];
  value: unknown;
  onChange: (v: unknown) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  const [showPass, setShowPass] = useState(false);

  if (field.type === 'boolean') {
    const boolVal = value === true || value === 'true';
    return (
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={boolVal}
          onChange={e => { onChange(e.target.checked); }}
          className="sr-only peer" />
        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
      </label>
    );
  }

  if (field.type === 'color') {
    return (
      <div className="flex items-center gap-2">
        <input type="color" value={String(value || '#2563eb')}
          onChange={e => onChange(e.target.value)}
          className="w-10 h-9 border border-gray-200 rounded-lg cursor-pointer" />
        <input type="text" value={String(value || '')}
          onChange={e => onChange(e.target.value)}
          className="w-28 px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <SaveButton saving={saving} saved={saved} onSave={onSave} />
      </div>
    );
  }

  if (field.type === 'password') {
    return (
      <div className="flex items-center gap-2">
        <div className="relative">
          <input type={showPass ? 'text' : 'password'} value={String(value || '')}
            onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-72 px-3 py-2 pr-9 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="button" onClick={() => setShowPass(s => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <SaveButton saving={saving} saved={saved} onSave={onSave} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        value={String(value ?? '')}
        onChange={e => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
        placeholder={field.placeholder}
        className="w-72 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <SaveButton saving={saving} saved={saved} onSave={onSave} />
    </div>
  );
}

function SaveButton({ saving, saved, onSave }: { saving: boolean; saved: boolean; onSave: () => void }) {
  return (
    <button onClick={onSave} disabled={saving}
      className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
      {saved ? <CheckCircle className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
  const [form, setForm] = useState<FlatSettings>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const { data: rawSettings, isLoading, refetch } = useQuery<FlatSettings>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
  });

  useEffect(() => {
    if (rawSettings) {
      const hasData = Object.keys(rawSettings).length > 0;
      if (!hasData) {
        api.post('/settings/init', {}).then(() => refetch());
      } else {
        setForm(rawSettings);
      }
    }
  }, [rawSettings]);

  const updateSetting = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) => {
      const group = key.split('.')[0] || 'general';
      return api.put(`/settings/${key}`, { value, group });
    },
    onSuccess: (_: unknown, { key }: { key: string; value: unknown }) => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      setSaved(p => ({ ...p, [key]: true }));
      setSaving(p => ({ ...p, [key]: false }));
      setTimeout(() => setSaved(p => ({ ...p, [key]: false })), 2500);
    },
    onError: (_: unknown, { key }: { key: string; value: unknown }) => {
      setSaving(p => ({ ...p, [key]: false }));
    },
  });

  const handleSave = (key: string) => {
    setSaving(p => ({ ...p, [key]: true }));
    updateSetting.mutate({ key, value: form[key] });
  };

  const handleBoolChange = (key: string, val: boolean) => {
    setForm(p => ({ ...p, [key]: val }));
    setSaving(p => ({ ...p, [key]: true }));
    updateSetting.mutate({ key, value: val });
  };

  const tabFields = FIELD_DEFS.filter(f => f.group === activeTab);

  if (isLoading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-100">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="divide-y divide-gray-50">
          {tabFields.map(field => (
            <div key={field.key} className="px-6 py-4 flex items-start justify-between gap-6">
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="text-sm font-medium text-gray-900">{field.label}</div>
                <div className="text-xs text-gray-400 font-mono mt-0.5">{field.key}</div>
                {field.hint && <div className="text-xs text-gray-400 mt-1 italic">{field.hint}</div>}
              </div>
              <div className="flex-shrink-0">
                <FieldInput
                  field={field}
                  value={form[field.key] ?? ''}
                  onChange={val => {
                    if (field.type === 'boolean') handleBoolChange(field.key, val as boolean);
                    else setForm(p => ({ ...p, [field.key]: val }));
                  }}
                  onSave={() => handleSave(field.key)}
                  saving={!!saving[field.key]}
                  saved={!!saved[field.key]}
                />
              </div>
            </div>
          ))}

          {tabFields.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-400">
              <Settings className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Нет настроек в этой категории</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{Object.keys(form).length} настроек загружено</span>
        <button onClick={() => api.post('/settings/init', {}).then(() => refetch())}
          className="flex items-center gap-1.5 text-blue-600 hover:underline">
          <RefreshCw className="w-3 h-3" />
          Сбросить к умолчаниям
        </button>
      </div>
    </div>
  );
}
