import { pgTable, text, serial, timestamp, integer, numeric, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { relations } from "drizzle-orm";
import { orderItemsTable } from "./orderItems";
import { orderStatusHistoryTable } from "./orderStatusHistory";

export const ORDER_STATUSES = ["new", "confirmed", "paid", "assembled", "issued", "delivered", "completed", "cancelled"] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

export const DELIVERY_TYPES = ["pickup", "delivery"] as const;
export type DeliveryType = typeof DELIVERY_TYPES[number];

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerId: integer("customer_id").references(() => customersTable.id),
  status: text("status").notNull().$type<OrderStatus>().default("new"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  deliveryType: text("delivery_type").notNull().$type<DeliveryType>(),
  deliveryAddress: text("delivery_address"),
  comment: text("comment"),
  exactPrice: numeric("exact_price", { precision: 10, scale: 2 }),
  approximatePrice: numeric("approximate_price", { precision: 10, scale: 2 }),
  managerReviewRequired: boolean("manager_review_required").notNull().default(false),
  pricingComment: text("pricing_comment"),
  tariffUsed: text("tariff_used"),
  totalDeposit: numeric("total_deposit", { precision: 10, scale: 2 }),
  privacyAccepted: boolean("privacy_accepted").notNull().default(false),
  assignedManagerId: integer("assigned_manager_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const ordersRelations = relations(ordersTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [ordersTable.customerId],
    references: [customersTable.id],
  }),
  items: many(orderItemsTable),
  statusHistory: many(orderStatusHistoryTable),
}));

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
