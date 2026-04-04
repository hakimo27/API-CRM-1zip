import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const LOG_LEVELS = ["debug", "info", "warn", "error", "fatal"] as const;
export type LogLevel = typeof LOG_LEVELS[number];

export const LOG_CHANNELS = [
  "app", "api", "auth", "telegram", "chat",
  "notification", "import", "queue", "webhook", "system",
] as const;
export type LogChannel = typeof LOG_CHANNELS[number];

export const systemLogsTable = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  level: text("level").$type<LogLevel>().notNull().default("info"),
  channel: text("channel").$type<LogChannel>().notNull().default("app"),
  message: text("message").notNull(),
  context: jsonb("context").$type<Record<string, unknown>>(),
  userId: integer("user_id"),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  requestId: text("request_id"),
  error: text("error"),
  stackTrace: text("stack_trace"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SystemLog = typeof systemLogsTable.$inferSelect;
