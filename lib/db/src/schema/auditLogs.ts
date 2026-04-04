import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const AUDIT_ACTIONS = [
  "create", "update", "delete", "archive", "restore",
  "activate", "deactivate", "login", "logout", "reset_password",
] as const;
export type AuditAction = typeof AUDIT_ACTIONS[number];

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  userEmail: text("user_email"),
  action: text("action").$type<AuditAction>().notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  entityLabel: text("entity_label"),
  changes: jsonb("changes").$type<Record<string, { from: unknown; to: unknown }>>(),
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AuditLog = typeof auditLogsTable.$inferSelect;
