import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ordersTable } from "./orders";
import { relations } from "drizzle-orm";

export const orderStatusHistoryTable = pgTable("order_status_history", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  comment: text("comment"),
  changedBy: integer("changed_by"),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderStatusHistoryRelations = relations(orderStatusHistoryTable, ({ one }) => ({
  order: one(ordersTable, {
    fields: [orderStatusHistoryTable.orderId],
    references: [ordersTable.id],
  }),
}));

export const insertOrderStatusHistorySchema = createInsertSchema(orderStatusHistoryTable).omit({ id: true, changedAt: true });
export type InsertOrderStatusHistory = z.infer<typeof insertOrderStatusHistorySchema>;
export type OrderStatusHistory = typeof orderStatusHistoryTable.$inferSelect;
