import { pgTable, text, serial, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value"),
  group: text("group").notNull().default("general"),
  label: text("label"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const inventoryStatusHistoriesTable = pgTable("inventory_status_histories", {
  id: serial("id").primaryKey(),
  inventoryUnitId: integer("inventory_unit_id").notNull(),
  oldStatus: text("old_status"),
  newStatus: text("new_status").notNull(),
  reason: text("reason"),
  changedById: integer("changed_by_id").references(() => usersTable.id),
  notes: text("notes"),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const repairRecordsTable = pgTable("repair_records", {
  id: serial("id").primaryKey(),
  inventoryUnitId: integer("inventory_unit_id").notNull(),
  description: text("description").notNull(),
  cost: text("cost"),
  status: text("status").notNull().default("pending"),
  assignedToId: integer("assigned_to_id").references(() => usersTable.id),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const messageTemplatesTable = pgTable("message_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").default("general"),
  content: text("content").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const telegramBindingsTable = pgTable("telegram_bindings", {
  id: serial("id").primaryKey(),
  telegramChatId: text("telegram_chat_id").notNull().unique(),
  telegramUserId: text("telegram_user_id"),
  telegramUsername: text("telegram_username"),
  sessionId: integer("session_id"),
  userId: integer("user_id").references(() => usersTable.id),
  topicId: integer("topic_id"),
  messageThreadId: integer("message_thread_id"),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  syncStatus: text("sync_status").default("ok"),
  lastSyncError: text("last_sync_error"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const notificationLogsTable = pgTable("notification_logs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  channel: text("channel").notNull(),
  recipientId: integer("recipient_id").references(() => usersTable.id),
  orderId: integer("order_id"),
  subject: text("subject"),
  content: text("content").notNull(),
  status: text("status").notNull().default("pending"),
  error: text("error"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Setting = typeof settingsTable.$inferSelect;
export type TelegramBinding = typeof telegramBindingsTable.$inferSelect;
export type MessageTemplate = typeof messageTemplatesTable.$inferSelect;
