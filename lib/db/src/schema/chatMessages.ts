import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { chatSessionsTable } from "./chatSessions";
import { relations } from "drizzle-orm";

export const MESSAGE_SENDERS = ["customer", "manager", "bot"] as const;
export type MessageSender = typeof MESSAGE_SENDERS[number];

export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => chatSessionsTable.id, { onDelete: "cascade" }),
  sender: text("sender").notNull().$type<MessageSender>(),
  senderName: text("sender_name"),
  content: text("content").notNull(),
  readByManager: boolean("read_by_manager").notNull().default(false),
  telegramMessageId: text("telegram_message_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatMessagesRelations = relations(chatMessagesTable, ({ one }) => ({
  session: one(chatSessionsTable, {
    fields: [chatMessagesTable.sessionId],
    references: [chatSessionsTable.id],
  }),
}));

export const insertChatMessageSchema = createInsertSchema(chatMessagesTable).omit({ id: true, createdAt: true });
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessagesTable.$inferSelect;
