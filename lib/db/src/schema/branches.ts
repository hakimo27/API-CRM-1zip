import { pgTable, text, serial, timestamp, boolean, integer, jsonb, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const BRANCH_TYPES = ["main", "satellite", "partner"] as const;
export type BranchType = (typeof BRANCH_TYPES)[number];

export const branchesTable = pgTable("branches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  type: text("type").$type<BranchType>().notNull().default("satellite"),
  address: text("address"),
  city: text("city").notNull().default("Москва"),
  lat: numeric("lat", { precision: 10, scale: 7 }),
  lng: numeric("lng", { precision: 10, scale: 7 }),
  phones: jsonb("phones").$type<string[]>().default([]),
  emails: jsonb("emails").$type<string[]>().default([]),
  workingHours: jsonb("working_hours").$type<Record<string, string>>().default({}),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBranchSchema = createInsertSchema(branchesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Branch = typeof branchesTable.$inferSelect;
