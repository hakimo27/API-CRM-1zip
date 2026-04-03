import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { ordersTable } from "./orders";
import { relations } from "drizzle-orm";
import { chatMessagesTable } from "./chatMessages";

export const CHAT_SESSION_STATUSES = ["open", "pending", "resolved", "closed", "archived"] as const;
export type ChatSessionStatus = typeof CHAT_SESSION_STATUSES[number];

export const CHAT_CHANNELS = ["web", "telegram", "whatsapp", "phone", "email"] as const;
export type ChatChannel = typeof CHAT_CHANNELS[number];

export const chatSessionsTable = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  sessionToken: text("session_token").unique(),
  customerId: integer("customer_id").references(() => customersTable.id),
  orderId: integer("order_id").references(() => ordersTable.id),
  customerName: text("customer_name"),
  channel: text("channel").$type<ChatChannel>().notNull().default("web"),
  status: text("status").notNull().$type<ChatSessionStatus>().default("open"),
  telegramChatId: text("telegram_chat_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  unreadCount: integer("unread_count").notNull().default(0),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const chatSessionsRelations = relations(chatSessionsTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [chatSessionsTable.customerId],
    references: [customersTable.id],
  }),
  order: one(ordersTable, {
    fields: [chatSessionsTable.orderId],
    references: [ordersTable.id],
  }),
  messages: many(chatMessagesTable),
}));

export const insertChatSessionSchema = createInsertSchema(chatSessionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatSession = typeof chatSessionsTable.$inferSelect;
