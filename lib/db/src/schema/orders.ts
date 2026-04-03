import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { relations } from "drizzle-orm";
import { orderItemsTable } from "./orderItems";
import { orderStatusHistoryTable } from "./orderStatusHistory";

export const ORDER_STATUSES = [
  "new",
  "confirmed",
  "paid",
  "assembled",
  "issued",
  "in_progress",
  "completed",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

export const DELIVERY_TYPES = ["pickup", "delivery"] as const;
export type DeliveryType = typeof DELIVERY_TYPES[number];

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerId: integer("customer_id").references(() => customersTable.id),
  status: text("status").notNull().$type<OrderStatus>().default("new"),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }),
  depositPaid: boolean("deposit_paid").notNull().default(false),
  deliveryType: text("delivery_type").$type<DeliveryType>().default("pickup"),
  deliveryAddress: text("delivery_address"),
  notes: text("notes"),
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
