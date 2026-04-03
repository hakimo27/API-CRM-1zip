import { Injectable, Inject } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import { settingsTable } from "@workspace/db";

type DrizzleDb = typeof import("@workspace/db").db;

const DEFAULT_SETTINGS: Array<{ key: string; value: unknown; group: string; label?: string }> = [
  { key: "general.company_name", value: "КаякРент", group: "general", label: "Название компании" },
  { key: "general.company_slogan", value: "Аренда водного снаряжения", group: "general", label: "Слоган" },
  { key: "general.tagline", value: "Лучший прокат байдарок и каяков", group: "general", label: "Подзаголовок" },
  { key: "general.site_name", value: "КаякРент", group: "general", label: "Имя сайта (браузер)" },
  { key: "general.footer_text", value: "© 2025 КаякРент. Все права защищены.", group: "general", label: "Текст в подвале" },
  { key: "general.copyright", value: "КаякРент 2025", group: "general", label: "Copyright" },

  { key: "contacts.phone", value: "+7 (999) 000-00-00", group: "contacts", label: "Телефон" },
  { key: "contacts.phone2", value: "", group: "contacts", label: "Телефон 2" },
  { key: "contacts.email", value: "info@kayakrent.ru", group: "contacts", label: "Email" },
  { key: "contacts.address", value: "г. Москва", group: "contacts", label: "Адрес" },
  { key: "contacts.city", value: "Москва", group: "contacts", label: "Город" },
  { key: "contacts.coordinates_lat", value: "55.7558", group: "contacts", label: "Координаты (широта)" },
  { key: "contacts.coordinates_lng", value: "37.6176", group: "contacts", label: "Координаты (долгота)" },
  { key: "contacts.schedule", value: "Пн–Вс: 09:00–21:00", group: "contacts", label: "График работы" },
  { key: "contacts.telegram", value: "", group: "contacts", label: "Telegram (username)" },
  { key: "contacts.whatsapp", value: "", group: "contacts", label: "WhatsApp (номер)" },
  { key: "contacts.vk", value: "", group: "contacts", label: "ВКонтакте (ссылка)" },
  { key: "contacts.instagram", value: "", group: "contacts", label: "Instagram (ссылка)" },
  { key: "contacts.youtube", value: "", group: "contacts", label: "YouTube (ссылка)" },

  { key: "branding.logo_url", value: "", group: "branding", label: "URL логотипа" },
  { key: "branding.favicon_url", value: "", group: "branding", label: "URL favicon" },
  { key: "branding.primary_color", value: "#2563eb", group: "branding", label: "Основной цвет" },
  { key: "branding.og_image_url", value: "", group: "branding", label: "OG Image (для соцсетей)" },

  { key: "booking.min_rental_hours", value: 4, group: "booking", label: "Минимум часов аренды" },
  { key: "booking.deposit_required", value: true, group: "booking", label: "Требовать залог" },
  { key: "booking.advance_booking_days", value: 30, group: "booking", label: "Макс. срок бронирования (дней)" },
  { key: "booking.cancellation_hours", value: 24, group: "booking", label: "Порог отмены без штрафа (часов)" },

  { key: "telegram.enabled", value: false, group: "telegram", label: "Telegram бот включён" },
  { key: "telegram.bot_token", value: "", group: "telegram", label: "Bot Token" },
  { key: "telegram.bot_username", value: "", group: "telegram", label: "Bot Username" },
  { key: "telegram.webhook_url", value: "", group: "telegram", label: "Webhook URL" },
  { key: "telegram.webhook_secret", value: "", group: "telegram", label: "Webhook Secret" },
  { key: "telegram.manager_chat_id", value: "", group: "telegram", label: "Chat ID менеджера" },
  { key: "telegram.manager_group_id", value: "", group: "telegram", label: "Group ID менеджеров" },
  { key: "telegram.forum_chat_id", value: "", group: "telegram", label: "Forum Chat ID" },
  { key: "telegram.orders_topic_id", value: "", group: "telegram", label: "Topic ID: Заказы" },
  { key: "telegram.chats_topic_id", value: "", group: "telegram", label: "Topic ID: Чаты" },
  { key: "telegram.warehouse_topic_id", value: "", group: "telegram", label: "Topic ID: Склад" },
  { key: "telegram.payments_topic_id", value: "", group: "telegram", label: "Topic ID: Оплаты" },
  { key: "telegram.tours_topic_id", value: "", group: "telegram", label: "Topic ID: Туры" },
  { key: "telegram.bidirectional_sync", value: false, group: "telegram", label: "Двусторонняя синхронизация" },
  { key: "telegram.notify_orders", value: true, group: "telegram", label: "Уведомления по заказам" },
  { key: "telegram.use_forum_topics", value: false, group: "telegram", label: "Использовать forum topics" },
  { key: "telegram.create_topic_per_order", value: false, group: "telegram", label: "Создавать топик на каждый заказ" },
  { key: "telegram.fallback_topic_id", value: "", group: "telegram", label: "Fallback Topic ID" },

  { key: "notifications.email_on_order", value: true, group: "notifications", label: "Email при новом заказе" },
  { key: "notifications.telegram_on_order", value: true, group: "notifications", label: "Telegram при новом заказе" },
  { key: "notifications.email_host", value: "", group: "notifications", label: "SMTP Host" },
  { key: "notifications.email_port", value: 587, group: "notifications", label: "SMTP Port" },
  { key: "notifications.email_user", value: "", group: "notifications", label: "SMTP User" },
  { key: "notifications.email_password", value: "", group: "notifications", label: "SMTP Password" },
  { key: "notifications.email_from", value: "noreply@kayakrent.ru", group: "notifications", label: "Email отправителя" },
  { key: "notifications.email_on_register", value: true, group: "notifications", label: "Email при регистрации" },
];

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

  async getAllWithMeta() {
    const settings = await this.db.select().from(settingsTable);
    return settings;
  }

  async getByGroup(group: string) {
    const settings = await this.db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.group, group));
    return settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, unknown>);
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

  async setBulk(settings: Record<string, unknown>, group?: string) {
    const results = await Promise.all(
      Object.entries(settings).map(([key, value]) => this.set(key, value, group))
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
