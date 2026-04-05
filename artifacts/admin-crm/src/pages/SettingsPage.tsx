import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { PhoneInput } from '@/components/PhoneInput';
import {
  Save, RotateCcw, Eye, EyeOff, Loader2, CheckCircle2, XCircle,
  AlertTriangle, Settings, Phone, Palette, Calendar, Truck,
  Send, Bell, Info, Upload, X,
} from 'lucide-react';

// ─── FIELD TYPE ───────────────────────────────────────────────────────────────
type FieldType = 'text' | 'number' | 'boolean' | 'password' | 'color' | 'url' | 'textarea' | 'tel' | 'image' | 'working-hours';
interface FieldDef {
  key: string;
  label: string;
  hint?: string;
  type?: FieldType;
  placeholder?: string;
  section?: string;
}

// ─── TABS DEFINITION ─────────────────────────────────────────────────────────
interface TabDef {
  id: string;
  label: string;
  saveLabel: string;
  fields: FieldDef[];
}

const TABS: TabDef[] = [
  {
    id: 'general',
    label: 'Основные',
    saveLabel: 'основные настройки',
    fields: [
      { key: 'general.company_name',    label: 'Название компании',       hint: 'Отображается в шапке и подвале сайта' },
      { key: 'general.site_name_short', label: 'Короткое название',       hint: 'Используется в кратких подписях' },
      { key: 'general.company_slogan',  label: 'Слоган',                  hint: 'Короткий девиз под названием' },
      { key: 'general.tagline',         label: 'Подзаголовок главной',    hint: 'Текст в hero-секции главной страницы' },
      { key: 'general.site_name',       label: 'Название в браузере',     hint: 'Title вкладки и SEO' },
      { key: 'general.footer_text',     label: 'Текст в подвале',         hint: 'Краткое описание в footer' },
      { key: 'general.copyright',       label: 'Copyright строка',        hint: 'Например: Байдабаза 2025' },
    ],
  },
  {
    id: 'contacts',
    label: 'Контакты',
    saveLabel: 'контакты',
    fields: [
      { key: 'contacts.phone',          label: 'Телефон (основной)',      type: 'tel',      placeholder: '+7 (999) 000-00-00', section: 'Телефоны и мессенджеры' },
      { key: 'contacts.phone2',         label: 'Телефон (дополнительный)',type: 'tel',      placeholder: '+7 (999) 000-00-00' },
      { key: 'contacts.telegram',       label: 'Telegram',                hint: 'Username без @, например: baidabase',          placeholder: 'baidabase' },
      { key: 'contacts.vk',             label: 'ВКонтакте',               type: 'url',      placeholder: 'https://vk.com/...' },
      { key: 'contacts.max',            label: 'MAX (мессенджер)',         placeholder: 'Номер или ссылка' },
      { key: 'contacts.whatsapp',       label: 'WhatsApp',                hint: 'Номер для ссылки wa.me (без +)',               placeholder: '79990000000' },
      { key: 'contacts.email',          label: 'Email',                    type: 'text',     placeholder: 'info@baidabase.ru', section: 'Адрес и расположение' },
      { key: 'contacts.address',        label: 'Адрес',                   placeholder: 'г. Москва, ул. Речная, 1' },
      { key: 'contacts.city',           label: 'Город',                   placeholder: 'Москва' },
      { key: 'contacts.schedule',       label: 'График работы',           placeholder: 'Пн–Вс: 09:00–21:00' },
      { key: 'contacts.directions',     label: 'Как добраться',           type: 'textarea', hint: 'Описание маршрута для страницы контактов' },
      { key: 'contacts.parking',        label: 'Парковка',                hint: 'Информация о парковке рядом' },
      { key: 'contacts.contact_person', label: 'Контактное лицо',         hint: 'Имя менеджера для связи' },
      { key: 'contacts.coordinates_lat',label: 'Широта (lat)',            type: 'text',     placeholder: '55.7558', section: 'Координаты на карте' },
      { key: 'contacts.coordinates_lng',label: 'Долгота (lng)',           type: 'text',     placeholder: '37.6176' },
      { key: 'contacts.youtube',        label: 'YouTube (ссылка)',         type: 'url',      placeholder: 'https://youtube.com/...', section: 'Социальные сети' },
    ],
  },
  {
    id: 'branding',
    label: 'Брендинг',
    saveLabel: 'брендинг',
    fields: [
      { key: 'branding.logo_url',       label: 'Логотип',                 type: 'image', hint: 'Логотип сайта (рекомендуется SVG или PNG с прозрачностью)' },
      { key: 'branding.logo_light_url', label: 'Логотип для светлого фона', type: 'image', hint: 'Версия логотипа для белых фонов' },
      { key: 'branding.favicon_url',    label: 'Favicon',                 type: 'image', hint: 'Иконка для браузерной вкладки (.ico или .png, 32×32 px)' },
      { key: 'branding.primary_color',  label: 'Основной цвет',           type: 'color', hint: 'Основной акцентный цвет сайта' },
      { key: 'branding.secondary_color',label: 'Дополнительный цвет',     type: 'color' },
      { key: 'branding.og_image_url',   label: 'OG Image по умолчанию',   type: 'image', hint: 'Изображение для предпросмотра в соцсетях (1200×630 px)' },
    ],
  },
  {
    id: 'booking',
    label: 'Бронирование',
    saveLabel: 'настройки бронирования',
    fields: [
      { key: 'booking.online_enabled',           label: 'Включить онлайн-бронирование',    type: 'boolean', section: 'Основное' },
      { key: 'booking.auto_confirm',             label: 'Автоматически подтверждать простые заказы', type: 'boolean', hint: 'Без ручного подтверждения менеджером' },
      { key: 'booking.allow_approx_price',       label: 'Разрешить приблизительную цену',  type: 'boolean', hint: 'Показывать ≈ до уточнения менеджером' },
      { key: 'booking.min_rental_hours',         label: 'Минимум часов аренды',            type: 'number',  placeholder: '4', section: 'Условия' },
      { key: 'booking.advance_booking_days',     label: 'Максимальный срок бронирования (дней)', type: 'number', placeholder: '30' },
      { key: 'booking.cancellation_hours',       label: 'Порог отмены без штрафа (часов)', type: 'number',  placeholder: '24' },
      { key: 'booking.deposit_required',         label: 'Требовать залог',                 type: 'boolean', section: 'Залог' },
      { key: 'booking.deposit_text',             label: 'Текст о залоге',                  type: 'textarea', hint: 'Отображается на странице оформления заказа' },
      { key: 'booking.show_deposit_on_checkout', label: 'Показывать залог на checkout',    type: 'boolean' },
      { key: 'booking.confirmation_text',        label: 'Текст о подтверждении',           type: 'textarea', hint: 'Показывается покупателю после оформления', section: 'Сообщения' },
      { key: 'booking.show_delivery_choice',     label: 'Включить выбор доставки / самовывоза', type: 'boolean', section: 'Доставка' },
    ],
  },
  {
    id: 'delivery',
    label: 'Доставка',
    saveLabel: 'настройки доставки',
    fields: [
      { key: 'delivery.enabled',             label: 'Включить доставку',            type: 'boolean', hint: 'Разрешить заказ с доставкой', section: 'Включение' },
      { key: 'delivery.self_pickup_enabled', label: 'Включить самовывоз',           type: 'boolean' },
      { key: 'delivery.show_on_site',        label: 'Показывать блок доставки на сайте', type: 'boolean' },
      { key: 'delivery.manager_required',    label: 'Требовать подтверждение менеджера для доставки', type: 'boolean', section: 'Параметры' },
      { key: 'delivery.same_day_enabled',    label: 'Разрешить доставку день в день', type: 'boolean' },
      { key: 'delivery.price_from',          label: 'Стоимость доставки от',        placeholder: '500', hint: 'Минимальная стоимость (руб.)' },
      { key: 'delivery.free_from_amount',    label: 'Бесплатная доставка от суммы', placeholder: '5000', hint: 'Сумма заказа для бесплатной доставки (руб.)' },
      { key: 'delivery.regions',             label: 'Зоны доставки',                placeholder: 'Москва, Подмосковье', hint: 'Список через запятую или текстом' },
      { key: 'delivery.schedule',            label: 'График доставки',              placeholder: 'Пн–Вс: 10:00–20:00' },
      { key: 'delivery.text_short',          label: 'Краткое описание',             placeholder: 'Самовывоз или доставка', hint: 'Показывается в карточках товаров', section: 'Тексты' },
      { key: 'delivery.text_full',           label: 'Полные условия доставки',      type: 'textarea', hint: 'Текст для страницы "Доставка и возврат"' },
      { key: 'delivery.notes',               label: 'Примечания',                   type: 'textarea', hint: 'Внутренние заметки для менеджеров' },
    ],
  },
  {
    id: 'telegram',
    label: 'Telegram',
    saveLabel: 'настройки Telegram',
    fields: [
      { key: 'telegram.enabled',              label: 'Telegram бот включён',         type: 'boolean', section: 'Подключение' },
      { key: 'telegram.bot_token',            label: 'Bot Token',                    type: 'password', hint: 'Получить у @BotFather', placeholder: '1234567890:AAE...' },
      { key: 'telegram.bot_username',         label: 'Bot Username',                 placeholder: '@YourBot' },
      { key: 'telegram.webhook_url',          label: 'Webhook URL',                  type: 'url', hint: 'Публичный URL для получения обновлений', placeholder: 'https://yourdomain.com/api/telegram/webhook' },
      { key: 'telegram.webhook_secret',       label: 'Webhook Secret',               type: 'password', hint: 'Секрет для проверки запросов от Telegram' },
      { key: 'telegram.manager_chat_id',      label: 'Chat ID менеджера',            hint: 'ID личного чата для уведомлений', section: 'Чаты и топики' },
      { key: 'telegram.manager_group_id',     label: 'Group ID менеджеров',          hint: 'ID группового чата команды' },
      { key: 'telegram.forum_chat_id',        label: 'Forum Chat ID',                hint: 'ID форум-группы для топиков' },
      { key: 'telegram.use_forum_topics',     label: 'Использовать Forum Topics',    type: 'boolean' },
      { key: 'telegram.create_topic_per_order', label: 'Создавать топик на каждый заказ', type: 'boolean' },
      { key: 'telegram.orders_topic_id',      label: 'Topic ID: Заказы' },
      { key: 'telegram.chats_topic_id',       label: 'Topic ID: Чаты' },
      { key: 'telegram.warehouse_topic_id',   label: 'Topic ID: Склад' },
      { key: 'telegram.payments_topic_id',    label: 'Topic ID: Оплаты' },
      { key: 'telegram.tours_topic_id',       label: 'Topic ID: Туры' },
      { key: 'telegram.sale_topic_id',        label: 'Topic ID: Продажи' },
      { key: 'telegram.fallback_topic_id',    label: 'Fallback Topic ID',            hint: 'Используется если целевой топик недоступен' },
      { key: 'telegram.bidirectional_sync',   label: 'Двусторонняя синхронизация',   type: 'boolean', hint: 'Ответы из Telegram попадают в CRM-чат', section: 'Синхронизация' },
      { key: 'telegram.notify_orders',        label: 'Уведомления по заказам',       type: 'boolean' },
    ],
  },
  {
    id: 'notifications',
    label: 'Уведомления',
    saveLabel: 'настройки уведомлений',
    fields: [
      { key: 'notifications.email_on_order',         label: 'Email клиенту при новом заказе',         type: 'boolean', section: 'Email клиентам' },
      { key: 'notifications.email_manager_on_order', label: 'Email менеджеру при новом заказе',       type: 'boolean', section: 'Email менеджерам' },
      { key: 'notifications.email_on_register',      label: 'Email при регистрации нового клиента',   type: 'boolean' },
      { key: 'notifications.telegram_on_order',      label: 'Telegram менеджеру при новом заказе',   type: 'boolean', section: 'Telegram уведомления' },
      { key: 'notifications.telegram_warehouse',     label: 'Telegram складу при новом заказе',      type: 'boolean' },
      { key: 'notifications.notify_new_chat',        label: 'Уведомлять о новых сообщениях',         type: 'boolean' },
      { key: 'notifications.notify_repair',          label: 'Уведомлять о проблемах со складом',     type: 'boolean' },
      { key: 'notifications.notify_tour_booking',    label: 'Уведомлять о бронировании туров',       type: 'boolean' },
      { key: 'notifications.email_host',    label: 'SMTP Host',         placeholder: 'smtp.gmail.com', section: 'SMTP (для отправки email)' },
      { key: 'notifications.email_port',    label: 'SMTP Port',         type: 'number', placeholder: '587' },
      { key: 'notifications.email_user',    label: 'SMTP Логин',        placeholder: 'user@gmail.com' },
      { key: 'notifications.email_password',label: 'SMTP Пароль',       type: 'password' },
      { key: 'notifications.email_from',    label: 'Email отправителя', placeholder: 'noreply@baidabase.ru', hint: 'Адрес "От кого" в письмах' },
    ],
  },
  {
    id: 'chat',
    label: 'Чат-виджет',
    saveLabel: 'настройки чат-виджета',
    fields: [
      { key: 'chat.enabled',                    label: 'Включить чат-виджет',                       type: 'boolean',  section: 'Основное', hint: 'Показывать кнопку чата на сайте' },
      { key: 'chat.show_on_homepage',           label: 'Показывать на главной странице',            type: 'boolean' },
      { key: 'chat.show_on_product',            label: 'Показывать на страницах товаров',           type: 'boolean' },
      { key: 'chat.show_on_tour',               label: 'Показывать на страницах туров',             type: 'boolean' },
      { key: 'chat.greeting',                   label: 'Приветственное сообщение',                  placeholder: 'Здравствуйте! Чем можем помочь?', section: 'Тексты', hint: 'Первое сообщение при открытии чата' },
      { key: 'chat.placeholder',                label: 'Placeholder поля ввода',                    placeholder: 'Напишите нам...' },
      { key: 'chat.collect_name',               label: 'Запросить имя перед диалогом',              type: 'boolean',  section: 'Сбор данных перед чатом' },
      { key: 'chat.collect_phone',              label: 'Запросить телефон перед диалогом',          type: 'boolean' },
      { key: 'chat.collect_email',              label: 'Запросить email перед диалогом',            type: 'boolean' },
      { key: 'chat.offline_form_enabled',       label: 'Показывать форму обратной связи вне рабочего времени', type: 'boolean', section: 'Нерабочее время' },
      { key: 'chat.offline_message_text',       label: 'Текст при нерабочем времени',              type: 'textarea', placeholder: 'Сейчас мы вне рабочего времени. Оставьте контакты — свяжемся в рабочие часы.' },
      { key: 'chat.offline_form_require_name',  label: 'Имя — обязательное поле формы',            type: 'boolean' },
      { key: 'chat.offline_form_require_phone', label: 'Телефон — обязательное поле формы',        type: 'boolean' },
      { key: 'chat.offline_form_require_email', label: 'Email — обязательное поле формы',          type: 'boolean' },
      { key: 'chat.auto_create_customer',       label: 'Автоматически создавать карточку клиента',  type: 'boolean', hint: 'По данным из offline-формы' },
      { key: 'chat.working_hours_timezone',     label: 'Часовой пояс',                             placeholder: 'Europe/Moscow', section: 'График работы', hint: 'Например: Europe/Moscow, Asia/Yekaterinburg' },
      { key: 'chat.working_hours',              label: 'Расписание по дням',                       type: 'working-hours' },
    ],
  },
];

// ─── WORKING HOURS EDITOR ─────────────────────────────────────────────────────
const DAYS = [
  { key: 'mon', label: 'Пн' },
  { key: 'tue', label: 'Вт' },
  { key: 'wed', label: 'Ср' },
  { key: 'thu', label: 'Чт' },
  { key: 'fri', label: 'Пт' },
  { key: 'sat', label: 'Сб' },
  { key: 'sun', label: 'Вс' },
];

const DEFAULT_HOURS: Record<string, { enabled: boolean; start: string; end: string }> = {
  mon: { enabled: true, start: '10:00', end: '19:00' },
  tue: { enabled: true, start: '10:00', end: '19:00' },
  wed: { enabled: true, start: '10:00', end: '19:00' },
  thu: { enabled: true, start: '10:00', end: '19:00' },
  fri: { enabled: true, start: '10:00', end: '19:00' },
  sat: { enabled: true, start: '11:00', end: '17:00' },
  sun: { enabled: false, start: '00:00', end: '00:00' },
};

function WorkingHoursEditor({ value, onChange }: { value: unknown; onChange: (v: string) => void }) {
  const parsed = (() => {
    try {
      const obj = typeof value === 'string' && value ? JSON.parse(value) : {};
      return { ...DEFAULT_HOURS, ...obj };
    } catch { return { ...DEFAULT_HOURS }; }
  })();

  const update = (day: string, field: 'enabled' | 'start' | 'end', val: boolean | string) => {
    const next = { ...parsed, [day]: { ...parsed[day], [field]: val } };
    onChange(JSON.stringify(next));
  };

  return (
    <div className="w-full max-w-lg space-y-1.5">
      {DAYS.map(({ key, label }) => {
        const d = parsed[key] || DEFAULT_HOURS[key];
        return (
          <div key={key} className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${d.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}>
            <label className="flex items-center gap-2 cursor-pointer w-8 flex-shrink-0">
              <input type="checkbox" checked={d.enabled} onChange={e => update(key, 'enabled', e.target.checked)} className="rounded" />
              <span className={`text-xs font-semibold w-5 ${d.enabled ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
            </label>
            {d.enabled ? (
              <>
                <input type="time" value={d.start} onChange={e => update(key, 'start', e.target.value)}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="text-xs text-gray-400">—</span>
                <input type="time" value={d.end} onChange={e => update(key, 'end', e.target.value)}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </>
            ) : (
              <span className="text-xs text-gray-400 italic">выходной</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
interface ToastState { type: 'success' | 'error'; msg: string }

function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-medium transition-all ${
      toast.type === 'success'
        ? 'bg-emerald-600 text-white'
        : 'bg-red-600 text-white'
    }`}>
      {toast.type === 'success'
        ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
        : <XCircle className="w-5 h-5 flex-shrink-0" />}
      {toast.msg}
    </div>
  );
}

// ─── IMAGE UPLOADER ────────────────────────────────────────────────────────────
function ImageFieldInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const result = await api.upload<{ url: string }>('/media/upload?folder=settings', fd);
      onChange(result.url);
    } catch (err: any) {
      alert('Ошибка загрузки: ' + err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2 max-w-md">
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="preview" className="h-16 w-auto rounded-lg border border-gray-200 object-contain bg-gray-50 p-1" />
          <button type="button" onClick={() => onChange('')}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="h-16 w-32 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300">
          <Upload className="w-6 h-6" />
        </div>
      )}
      <div className="flex gap-2 items-center flex-wrap">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://... или загрузите файл"
          className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 disabled:opacity-50 flex-shrink-0 whitespace-nowrap">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Загрузка…' : 'Загрузить файл'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>
    </div>
  );
}

// ─── FIELD RENDERER ───────────────────────────────────────────────────────────
function FieldInput({
  field, value, onChange,
}: { field: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const [showPass, setShowPass] = useState(false);
  const strVal = String(value ?? '');

  if (field.type === 'boolean') {
    const boolVal = value === true || value === 'true';
    return (
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={boolVal}
          onChange={e => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600
          after:content-[''] after:absolute after:top-[2px] after:left-[2px]
          after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all
          peer-checked:after:translate-x-full" />
      </label>
    );
  }

  if (field.type === 'color') {
    return (
      <div className="flex items-center gap-2">
        <input type="color" value={strVal || '#2563eb'}
          onChange={e => onChange(e.target.value)}
          className="w-10 h-10 border border-gray-200 rounded-lg cursor-pointer p-0.5" />
        <input type="text" value={strVal} onChange={e => onChange(e.target.value)}
          className="w-32 px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono
            focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
    );
  }

  if (field.type === 'password') {
    return (
      <div className="relative max-w-md">
        <input type={showPass ? 'text' : 'password'} value={strVal}
          onChange={e => onChange(e.target.value)} placeholder={field.placeholder}
          className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="button" onClick={() => setShowPass(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <textarea value={strVal} onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder} rows={3}
        className="w-full max-w-lg px-3 py-2.5 border border-gray-200 rounded-xl text-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
    );
  }

  if (field.type === 'tel') {
    return (
      <PhoneInput
        value={strVal}
        onChange={v => onChange(v)}
        placeholder={field.placeholder ?? '+7 (999) 000-00-00'}
        className="w-full max-w-md px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      />
    );
  }

  if (field.type === 'image') {
    return <ImageFieldInput value={strVal} onChange={v => onChange(v)} />;
  }

  if (field.type === 'working-hours') {
    return <WorkingHoursEditor value={value} onChange={v => onChange(v)} />;
  }

  return (
    <input
      type={field.type === 'number' ? 'number' : 'text'}
      value={strVal}
      onChange={e => onChange(
        field.type === 'number'
          ? (e.target.value === '' ? '' : Number(e.target.value))
          : e.target.value
      )}
      placeholder={field.placeholder}
      className="w-full max-w-md px-3 py-2.5 border border-gray-200 rounded-xl text-sm
        focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function SettingsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('general');
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [original, setOriginal] = useState<Record<string, unknown>>({});
  const [toast, setToast] = useState<ToastState | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: rawSettings, isLoading, refetch } = useQuery<Record<string, unknown>>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
  });

  useEffect(() => {
    if (!rawSettings) return;
    if (Object.keys(rawSettings).length === 0) {
      api.post('/settings/init', {}).then(() => refetch());
    } else {
      setForm(rawSettings);
      setOriginal(rawSettings);
    }
  }, [rawSettings]);

  const currentTab = useMemo(() => TABS.find(t => t.id === activeTab)!, [activeTab]);
  const tabKeys = useMemo(() => currentTab.fields.map(f => f.key), [currentTab]);

  const isDirty = useMemo(
    () => tabKeys.some(k => JSON.stringify(form[k]) !== JSON.stringify(original[k])),
    [form, original, tabKeys]
  );

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      tabKeys.forEach(k => { payload[k] = form[k] ?? ''; });
      await api.put('/settings', payload);
      setOriginal(prev => ({ ...prev, ...payload }));
      qc.invalidateQueries({ queryKey: ['settings'] });
      showToast('success', `Сохранено: ${currentTab.saveLabel}`);
    } catch (e: any) {
      showToast('error', e.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setForm(prev => {
      const next = { ...prev };
      tabKeys.forEach(k => { next[k] = original[k]; });
      return next;
    });
  };

  const setField = useCallback((key: string, value: unknown) => {
    setForm(p => ({ ...p, [key]: value }));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-sm">Загрузка настроек…</span>
        </div>
      </div>
    );
  }

  // Group fields by section
  const sections = currentTab.fields.reduce<{ name: string | null; fields: FieldDef[] }[]>((acc, f) => {
    if (f.section) acc.push({ name: f.section, fields: [] });
    if (acc.length === 0) acc.push({ name: null, fields: [] });
    acc[acc.length - 1].fields.push(f);
    return acc;
  }, []);

  return (
    <div className="max-w-4xl space-y-0">
      {/* Tab bar */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-100 scrollbar-none">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px flex-shrink-0 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 bg-blue-50/60'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}>
              {tab.label}
              {activeTab === tab.id && isDirty && (
                <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-amber-500 align-middle" />
              )}
            </button>
          ))}
        </div>

        {/* Unsaved changes bar */}
        {isDirty && (
          <div className="flex items-center justify-between gap-4 px-6 py-3 bg-amber-50 border-b border-amber-100">
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Есть несохранённые изменения</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleDiscard}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-white transition-colors">
                <RotateCcw className="w-3.5 h-3.5" /> Отменить
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Сохранить
              </button>
            </div>
          </div>
        )}

        {/* Delivery warning */}
        {activeTab === 'delivery' && (
          (() => {
            const deliveryOn = form['delivery.enabled'] === true || form['delivery.enabled'] === 'true';
            const pickupOn = form['delivery.self_pickup_enabled'] === true || form['delivery.self_pickup_enabled'] === 'true';
            if (!deliveryOn && !pickupOn) {
              return (
                <div className="flex items-center gap-2 px-6 py-3 bg-red-50 border-b border-red-100 text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  Внимание: и доставка, и самовывоз отключены — клиенты не смогут оформить заказ!
                </div>
              );
            }
            return null;
          })()
        )}

        {/* Fields */}
        <div className="divide-y divide-gray-50">
          {sections.map((sec, si) => (
            <div key={si}>
              {sec.name && (
                <div className="px-6 py-3 bg-gray-50/80 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{sec.name}</span>
                </div>
              )}
              {sec.fields.map(field => (
                <div key={field.key}
                  className={`px-6 py-4 flex items-start gap-6 ${
                    field.type === 'boolean' ? 'flex-row justify-between' : 'flex-col sm:flex-row sm:items-center'
                  }`}>
                  <div className={`flex-1 min-w-0 ${field.type === 'boolean' ? 'pt-0.5' : ''}`}>
                    <div className="text-sm font-medium text-gray-900">{field.label}</div>
                    {field.hint && (
                      <div className="text-xs text-gray-400 mt-0.5">{field.hint}</div>
                    )}
                  </div>
                  <div className={`flex-shrink-0 ${field.type === 'boolean' ? '' : 'w-full sm:w-auto'}`}>
                    <FieldInput
                      field={field}
                      value={form[field.key]}
                      onChange={v => setField(field.key, v)}
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Sticky footer save button */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {Object.keys(form).length} настроек загружено
          </span>
          <div className="flex items-center gap-3">
            {isDirty && (
              <button onClick={handleDiscard}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-white transition-colors">
                <RotateCcw className="w-4 h-4" /> Отменить изменения
              </button>
            )}
            <button onClick={handleSave} disabled={saving || !isDirty}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {saving
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Save className="w-4 h-4" />}
              {saving ? 'Сохранение…' : `Сохранить ${currentTab.saveLabel}`}
            </button>
          </div>
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  );
}
