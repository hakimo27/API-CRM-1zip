import { pgTable, text, serial, timestamp, integer, numeric, jsonb, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const SALE_ORDER_STATUSES = [
  "new",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export type SaleOrderStatus = (typeof SALE_ORDER_STATUSES)[number];

export const saleProductsTable = pgTable("sale_products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  sku: text("sku"),
  categoryId: integer("category_id"),
  brand: text("brand"),
  model: text("model"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  oldPrice: numeric("old_price", { precision: 10, scale: 2 }),
  description: text("description"),
  shortDescription: text("short_description"),
  specifications: jsonb("specifications").$type<Record<string, string>>().default({}),
  images: jsonb("images").$type<string[]>().default([]),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  stockStatus: text("stock_status").notNull().default("in_stock"),
  active: boolean("active").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
  isUsed: boolean("is_used").notNull().default(false),
  condition: text("condition"),
  manufactureYear: integer("manufacture_year"),
  inventoryNo: text("inventory_no"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const saleOrdersTable = pgTable("sale_orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  userId: integer("user_id").references(() => usersTable.id),
  status: text("status").$type<SaleOrderStatus>().notNull().default("new"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  deliveryAddress: jsonb("delivery_address").$type<{
    name: string;
    phone: string;
    address: string;
    city: string;
    postalCode?: string;
  }>(),
  deliveryMethod: text("delivery_method").default("pickup"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const saleOrderItemsTable = pgTable("sale_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => saleOrdersTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => saleProductsTable.id),
  quantity: integer("quantity").notNull().default(1),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const saleOrdersRelations = relations(saleOrdersTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [saleOrdersTable.userId],
    references: [usersTable.id],
  }),
  items: many(saleOrderItemsTable),
}));

export const saleOrderItemsRelations = relations(saleOrderItemsTable, ({ one }) => ({
  order: one(saleOrdersTable, {
    fields: [saleOrderItemsTable.orderId],
    references: [saleOrdersTable.id],
  }),
  product: one(saleProductsTable, {
    fields: [saleOrderItemsTable.productId],
    references: [saleProductsTable.id],
  }),
}));

export const insertSaleOrderSchema = createInsertSchema(saleOrdersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSaleOrder = z.infer<typeof insertSaleOrderSchema>;
export type SaleOrder = typeof saleOrdersTable.$inferSelect;
export type SaleProduct = typeof saleProductsTable.$inferSelect;
