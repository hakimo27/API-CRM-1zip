import { Injectable, Inject } from "@nestjs/common";
import { eq, inArray } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import { settingsTable } from "@workspace/db";

type DrizzleDb = typeof import("@workspace/db").db;

const DEFAULT_SETTINGS: Array<{ key: string; value: unknown; group: string; label?: string }> = [
  // ─── GENERAL ───────────────────────────────────────────────
  { key: "general.company_name",    value: "Байдабаза",                               group: "general",  label: "Название компании" },
  { key: "general.company_slogan",  value: "Аренда водного снаряжения",                group: "general",  label: "Слоган" },
  { key: "general.tagline",         value: "Лучший прокат байдарок и каяков",           group: "general",  label: "Подзаголовок" },
  { key: "general.site_name",       value: "Байдабаза",                               group: "general",  label: "Имя сайта (вкладка браузера)" },
  { key: "general.site_name_short", value: "Байдабаза",                               group: "general",  label: "Короткое название" },
  { key: "general.footer_text",     value: "Аренда байдарок, каноэ и SUP в Москве",  group: "general",  label: "Текст в подвале сайта" },
  { key: "general.copyright",       value: `Байдабаза ${new Date().getFullYear()}`,   group: "general",  label: "Copyright строка" },

  // ─── CONTACTS ──────────────────────────────────────────────
  { key: "contacts.phone",          value: "+7 (999) 000-00-00",  group: "contacts", label: "Телефон (основной)" },
  { key: "contacts.phone2",         value: "",                     group: "contacts", label: "Телефон (дополнительный)" },
  { key: "contacts.email",          value: "",                     group: "contacts", label: "Email" },
  { key: "contacts.address",        value: "г. Москва",            group: "contacts", label: "Адрес" },
  { key: "contacts.city",           value: "Москва",               group: "contacts", label: "Город" },
  { key: "contacts.schedule",       value: "Пн–Вс: 09:00–21:00",  group: "contacts", label: "График работы" },
  { key: "contacts.coordinates_lat", value: "55.7558",             group: "contacts", label: "Широта (lat)" },
  { key: "contacts.coordinates_lng", value: "37.6176",             group: "contacts", label: "Долгота (lng)" },
  { key: "contacts.directions",     value: "",                     group: "contacts", label: "Как добраться" },
  { key: "contacts.parking",        value: "",                     group: "contacts", label: "Парковка" },
  { key: "contacts.contact_person", value: "",                     group: "contacts", label: "Контактное лицо" },
  { key: "contacts.telegram",       value: "",                     group: "contacts", label: "Telegram (username)" },
  { key: "contacts.vk",             value: "",                     group: "contacts", label: "ВКонтакте (ссылка)" },
  { key: "contacts.max",            value: "",                     group: "contacts", label: "MAX (мессенджер)" },
  { key: "contacts.whatsapp",       value: "",                     group: "contacts", label: "WhatsApp (номер)" },
  { key: "contacts.youtube",        value: "",                     group: "contacts", label: "YouTube (ссылка)" },

  // ─── BRANDING ──────────────────────────────────────────────
  { key: "branding.logo_url",       value: "",          group: "branding", label: "Логотип (URL)" },
  { key: "branding.logo_light_url", value: "",          group: "branding", label: "Логотип для светлого фона (URL)" },
  { key: "branding.favicon_url",    value: "",          group: "branding", label: "Favicon (URL)" },
  { key: "branding.primary_color",  value: "#2563eb",   group: "branding", label: "Основной цвет" },
  { key: "branding.secondary_color",value: "#0ea5e9",   group: "branding", label: "Дополнительный цвет" },
  { key: "branding.og_image_url",   value: "",          group: "branding", label: "OG Image по умолчанию (URL)" },

  // ─── BOOKING ───────────────────────────────────────────────
  { key: "booking.online_enabled",           value: true,  group: "booking", label: "Включить онлайн-бронирование" },
  { key: "booking.auto_confirm",             value: false, group: "booking", label: "Автоматически подтверждать простые заказы" },
  { key: "booking.allow_approx_price",       value: true,  group: "booking", label: "Разрешить приблизительную цену" },
  { key: "booking.min_rental_hours",         value: 4,     group: "booking", label: "Минимум часов аренды в будни" },
  { key: "booking.advance_booking_days",     value: 30,    group: "booking", label: "Максимальный срок бронирования (дней)" },
  { key: "booking.cancellation_hours",       value: 24,    group: "booking", label: "Порог отмены без штрафа (часов до)" },
  { key: "booking.deposit_required",         value: true,  group: "booking", label: "Требовать залог" },
  { key: "booking.deposit_text",             value: "Залог возвращается после сдачи снаряжения в исходном состоянии.", group: "booking", label: "Текст о залоге" },
  { key: "booking.confirmation_text",        value: "Заказ будет подтверждён менеджером в течение 30 минут.", group: "booking", label: "Текст о подтверждении" },
  { key: "booking.show_deposit_on_checkout", value: true,  group: "booking", label: "Показывать залог на странице оформления" },
  { key: "booking.show_delivery_choice",     value: true,  group: "booking", label: "Включить выбор доставки / самовывоза" },

  // ─── DELIVERY ──────────────────────────────────────────────
  { key: "delivery.enabled",            value: false,                             group: "delivery", label: "Включить доставку" },
  { key: "delivery.self_pickup_enabled",value: true,                              group: "delivery", label: "Включить самовывоз" },
  { key: "delivery.show_on_site",       value: true,                              group: "delivery", label: "Показывать блок доставки на сайте" },
  { key: "delivery.manager_required",   value: false,                             group: "delivery", label: "Требовать подтверждение менеджера для доставки" },
  { key: "delivery.same_day_enabled",   value: false,                             group: "delivery", label: "Разрешить доставку день в день" },
  { key: "delivery.text_short",         value: "Самовывоз из точки проката",      group: "delivery", label: "Краткое описание доставки (для карточек)" },
  { key: "delivery.text_full",          value: "",                                group: "delivery", label: "Полные условия доставки (для страницы)" },
  { key: "delivery.price_from",         value: "",                                group: "delivery", label: "Стоимость доставки от (руб.)" },
  { key: "delivery.free_from_amount",   value: "",                                group: "delivery", label: "Бесплатная доставка от суммы (руб.)" },
  { key: "delivery.regions",            value: "",                                group: "delivery", label: "Зоны доставки (список через запятую)" },
  { key: "delivery.schedule",           value: "",                                group: "delivery", label: "График доставки" },
  { key: "delivery.notes",              value: "",                                group: "delivery", label: "Примечания к доставке" },

  // ─── TELEGRAM ──────────────────────────────────────────────
  { key: "telegram.enabled",              value: false, group: "telegram", label: "Telegram бот включён" },
  { key: "telegram.bot_token",            value: "",    group: "telegram", label: "Bot Token" },
  { key: "telegram.bot_username",         value: "",    group: "telegram", label: "Bot Username" },
  { key: "telegram.webhook_url",          value: "",    group: "telegram", label: "Webhook URL" },
  { key: "telegram.webhook_secret",       value: "",    group: "telegram", label: "Webhook Secret" },
  { key: "telegram.manager_chat_id",      value: "",    group: "telegram", label: "Chat ID менеджера" },
  { key: "telegram.manager_group_id",     value: "",    group: "telegram", label: "Group ID менеджеров" },
  { key: "telegram.forum_chat_id",        value: "",    group: "telegram", label: "Forum Chat ID" },
  { key: "telegram.use_forum_topics",     value: false, group: "telegram", label: "Использовать Forum Topics" },
  { key: "telegram.create_topic_per_order", value: false, group: "telegram", label: "Создавать топик на каждый заказ" },
  { key: "telegram.orders_topic_id",      value: "",    group: "telegram", label: "Topic ID: Заказы" },
  { key: "telegram.chats_topic_id",       value: "",    group: "telegram", label: "Topic ID: Чаты" },
  { key: "telegram.warehouse_topic_id",   value: "",    group: "telegram", label: "Topic ID: Склад" },
  { key: "telegram.payments_topic_id",    value: "",    group: "telegram", label: "Topic ID: Оплаты" },
  { key: "telegram.tours_topic_id",       value: "",    group: "telegram", label: "Topic ID: Туры" },
  { key: "telegram.sale_topic_id",        value: "",    group: "telegram", label: "Topic ID: Продажи" },
  { key: "telegram.fallback_topic_id",    value: "",    group: "telegram", label: "Fallback Topic ID" },
  { key: "telegram.bidirectional_sync",   value: false, group: "telegram", label: "Двусторонняя синхронизация сайт ↔ Telegram" },
  { key: "telegram.notify_orders",        value: true,  group: "telegram", label: "Уведомления по заказам аренды" },

  // ─── NOTIFICATIONS ──────────────────────────────────────────
  { key: "notifications.email_on_order",       value: true,  group: "notifications", label: "Email клиенту при новом заказе" },
  { key: "notifications.email_manager_on_order", value: true, group: "notifications", label: "Email менеджеру при новом заказе" },
  { key: "notifications.telegram_on_order",    value: true,  group: "notifications", label: "Telegram менеджеру при новом заказе" },
  { key: "notifications.telegram_warehouse",   value: false, group: "notifications", label: "Telegram складу при новом заказе" },
  { key: "notifications.email_on_register",    value: true,  group: "notifications", label: "Email при регистрации нового клиента" },
  { key: "notifications.notify_new_chat",      value: true,  group: "notifications", label: "Уведомлять о новых сообщениях" },
  { key: "notifications.notify_repair",        value: true,  group: "notifications", label: "Уведомлять о проблемах со складом/ремонте" },
  { key: "notifications.notify_tour_booking",  value: true,  group: "notifications", label: "Уведомлять о бронировании туров" },
  { key: "notifications.email_host",           value: "",    group: "notifications", label: "SMTP Host" },
  { key: "notifications.email_port",           value: 587,   group: "notifications", label: "SMTP Port" },
  { key: "notifications.email_user",           value: "",    group: "notifications", label: "SMTP Логин" },
  { key: "notifications.email_password",       value: "",    group: "notifications", label: "SMTP Пароль" },
  { key: "notifications.email_from",           value: "",    group: "notifications", label: "Email отправителя" },
  { key: "notifications.manager_email",        value: "",    group: "notifications", label: "Email менеджера (для уведомлений о заказах)" },

  // ─── CHAT WIDGET ──────────────────────────────────────────────
  { key: "chat.enabled",            value: true,  group: "chat", label: "Включить чат-виджет" },
  { key: "chat.show_on_homepage",   value: true,  group: "chat", label: "Показывать на главной" },
  { key: "chat.show_on_product",    value: true,  group: "chat", label: "Показывать на карточках товаров" },
  { key: "chat.show_on_sale",       value: true,  group: "chat", label: "Показывать на страницах продажи" },
  { key: "chat.show_on_tour",       value: true,  group: "chat", label: "Показывать на страницах туров" },
  { key: "chat.show_on_contacts",   value: true,  group: "chat", label: "Показывать на странице контактов" },
  { key: "chat.greeting",           value: "Здравствуйте! Чем можем помочь?", group: "chat", label: "Приветственное сообщение" },
  { key: "chat.offline_message",    value: "Мы сейчас не в сети. Оставьте сообщение — ответим в ближайшее время.", group: "chat", label: "Сообщение в нерабочее время" },
  { key: "chat.placeholder",        value: "Напишите нам...", group: "chat", label: "Placeholder поля ввода" },
  { key: "chat.collect_name",       value: false, group: "chat", label: "Собирать имя перед диалогом" },
  { key: "chat.collect_phone",      value: false, group: "chat", label: "Собирать телефон перед диалогом" },
  { key: "chat.collect_email",      value: false, group: "chat", label: "Собирать email перед диалогом" },
];

// Groups returned to public site (no secrets)
const PUBLIC_GROUPS = ["general", "contacts", "branding", "delivery", "chat"];

@Injectable()
export class SettingsService {
  constructor(@Inject(DB_TOKEN) private db: DrizzleDb) {}

  async getAll() {
    const settings = await this.db.select().from(settingsTable);
    return settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, unknown>);
  }

  async getPublic() {
    const dbSettings = await this.db
      .select()
      .from(settingsTable)
      .where(inArray(settingsTable.group, PUBLIC_GROUPS));

    // Start with defaults so the public site always has values even before initDefaults is called
    const defaults = DEFAULT_SETTINGS
      .filter(d => PUBLIC_GROUPS.includes(d.group))
      .reduce((acc, d) => {
        if (!d.key.includes("token") && !d.key.includes("secret") && !d.key.includes("password")) {
          acc[d.key] = d.value;
        }
        return acc;
      }, {} as Record<string, unknown>);

    // DB values override defaults
    const fromDb = dbSettings.reduce((acc, s) => {
      if (!s.key.includes("token") && !s.key.includes("secret") && !s.key.includes("password")) {
        acc[s.key] = s.value;
      }
      return acc;
    }, {} as Record<string, unknown>);

    return { ...defaults, ...fromDb };
  }

  async getByGroup(group: string) {
    const settings = await this.db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.group, group));
    const defaults = DEFAULT_SETTINGS
      .filter(d => d.group === group)
      .reduce((acc, d) => { acc[d.key] = d.value; return acc; }, {} as Record<string, unknown>);
    const fromDb = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, unknown>);
    return { ...defaults, ...fromDb };
  }

  async get(key: string) {
    const [setting] = await this.db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, key))
      .limit(1);
    const def = DEFAULT_SETTINGS.find((d) => d.key === key);
    return setting?.value ?? def?.value ?? null;
  }

  async set(key: string, value: unknown, group?: string) {
    const existing = await this.db
      .select({ id: settingsTable.id })
      .from(settingsTable)
      .where(eq(settingsTable.key, key))
      .limit(1);

    const def = DEFAULT_SETTINGS.find((d) => d.key === key);
    const resolvedGroup = group || def?.group || key.split(".")[0] || "general";

    if (existing.length > 0) {
      const [updated] = await this.db
        .update(settingsTable)
        .set({ value, group: resolvedGroup })
        .where(eq(settingsTable.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await this.db
        .insert(settingsTable)
        .values({ key, value, group: resolvedGroup, label: def?.label })
        .returning();
      return created;
    }
  }

  async setBulk(settings: Record<string, unknown>) {
    const results = await Promise.all(
      Object.entries(settings).map(([key, value]) => this.set(key, value))
    );
    return results;
  }

  async initDefaults() {
    for (const def of DEFAULT_SETTINGS) {
      const [existing] = await this.db
        .select({ id: settingsTable.id })
        .from(settingsTable)
        .where(eq(settingsTable.key, def.key))
        .limit(1);
      if (!existing) {
        await this.db
          .insert(settingsTable)
          .values({ key: def.key, value: def.value, group: def.group, label: def.label })
          .onConflictDoNothing();
      }
    }
    return { message: "Настройки инициализированы", count: DEFAULT_SETTINGS.length };
  }
}
