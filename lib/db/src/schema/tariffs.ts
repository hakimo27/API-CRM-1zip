import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";
import { relations } from "drizzle-orm";

export const TARIFF_TYPES = ["weekend", "week", "weekday", "may_holidays"] as const;
export type TariffType = typeof TARIFF_TYPES[number];

export const tariffsTable = pgTable("tariffs", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().$type<TariffType>(),
  label: text("label").notNull(),
  pricePerDay: numeric("price_per_day", { precision: 10, scale: 2 }).notNull(),
  minDays: integer("min_days"),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tariffsRelations = relations(tariffsTable, ({ one }) => ({
  product: one(productsTable, {
    fields: [tariffsTable.productId],
    references: [productsTable.id],
  }),
}));

export const insertTariffSchema = createInsertSchema(tariffsTable).omit({ id: true, createdAt: true });
export type InsertTariff = z.infer<typeof insertTariffSchema>;
export type Tariff = typeof tariffsTable.$inferSelect;
