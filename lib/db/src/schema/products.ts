import { pgTable, text, serial, timestamp, boolean, integer, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";
import { relations } from "drizzle-orm";
import { productImagesTable } from "./productImages";
import { tariffsTable } from "./tariffs";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  sku: text("sku"),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id),
  shortDescription: text("short_description"),
  fullDescription: text("full_description"),
  active: boolean("active").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
  depositAmount: numeric("deposit_amount", { precision: 10, scale: 2 }),
  capacity: integer("capacity"),
  constructionType: text("construction_type"),
  weight: text("weight"),
  dimensions: text("dimensions"),
  kit: text("kit"),
  badge: text("badge"),
  specifications: jsonb("specifications"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  h1: text("h1"),
  ogTitle: text("og_title"),
  ogDescription: text("og_description"),
  canonicalUrl: text("canonical_url"),
  robots: text("robots").default("index,follow"),
  sortOrder: integer("sort_order").default(0),
  totalStock: integer("total_stock").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const productsRelations = relations(productsTable, ({ one, many }) => ({
  category: one(categoriesTable, {
    fields: [productsTable.categoryId],
    references: [categoriesTable.id],
  }),
  images: many(productImagesTable),
  tariffs: many(tariffsTable),
}));

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
