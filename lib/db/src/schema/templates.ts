import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";

export const specTemplatesTable = pgTable("spec_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  specs: jsonb("specs").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type SpecTemplate = typeof specTemplatesTable.$inferSelect;

export const tariffTemplatesTable = pgTable("tariff_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tariffs: jsonb("tariffs").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type TariffTemplate = typeof tariffTemplatesTable.$inferSelect;
