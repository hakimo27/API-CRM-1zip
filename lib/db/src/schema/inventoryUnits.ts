import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";
import { relations } from "drizzle-orm";

export const INVENTORY_STATUSES = [
  "available",
  "busy",
  "reserved",
  "checked",
  "ready_for_issue",
  "in_repair",
  "incomplete",
  "incoming",
  "written_off",
] as const;
export type InventoryStatus = typeof INVENTORY_STATUSES[number];

export const inventoryUnitsTable = pgTable("inventory_units", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  serialNumber: text("serial_number"),
  status: text("status").notNull().$type<InventoryStatus>().default("available"),
  condition: text("condition"),
  warehouseLocation: text("warehouse_location"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const inventoryUnitsRelations = relations(inventoryUnitsTable, ({ one }) => ({
  product: one(productsTable, {
    fields: [inventoryUnitsTable.productId],
    references: [productsTable.id],
  }),
}));

export const insertInventoryUnitSchema = createInsertSchema(inventoryUnitsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInventoryUnit = z.infer<typeof insertInventoryUnitSchema>;
export type InventoryUnit = typeof inventoryUnitsTable.$inferSelect;
