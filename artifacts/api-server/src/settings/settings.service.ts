import { Injectable, Inject } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import { settingsTable } from "@workspace/db";

type DrizzleDb = typeof import("@workspace/db").db;

const DEFAULT_SETTINGS: Record<string, unknown> = {
  "general.company_name": "КаякРент",
  "general.company_slogan": "Аренда водного снаряжения",
  "contacts.phone": "+7 (999) 000-00-00",
  "contacts.email": "info@kayakrent.ru",
  "contacts.address": "г. Москва",
  "booking.min_rental_hours": 4,
  "booking.deposit_required": true,
  "booking.advance_booking_days": 30,
  "telegram.bot_enabled": false,
  "notifications.email_on_order": true,
  "notifications.telegram_on_order": true,
};

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
    return setting?.value ?? DEFAULT_SETTINGS[key] ?? null;
  }

  async set(key: string, value: unknown, group?: string) {
    const existing = await this.db
      .select({ id: settingsTable.id })
      .from(settingsTable)
      .where(eq(settingsTable.key, key))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await this.db
        .update(settingsTable)
        .set({ value, group: group || "general" })
        .where(eq(settingsTable.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await this.db
        .insert(settingsTable)
        .values({ key, value, group: group || "general" })
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
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      const [setting] = await this.db
        .select({ id: settingsTable.id })
        .from(settingsTable)
        .where(eq(settingsTable.key, key))
        .limit(1);
      if (!setting) {
        const group = key.split(".")[0] || "general";
        await this.db.insert(settingsTable).values({ key, value, group }).onConflictDoNothing();
      }
    }
    return { message: "Настройки инициализированы" };
  }
}
