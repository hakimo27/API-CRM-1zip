import { pgTable, text, serial, timestamp, integer, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";
import { ordersTable } from "./orders";
import { relations } from "drizzle-orm";

export const RESERVATION_TYPES = ["order", "manual"] as const;
export type ReservationType = typeof RESERVATION_TYPES[number];

export const reservationsTable = pgTable("reservations", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  orderId: integer("order_id").references(() => ordersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().$type<ReservationType>().default("order"),
  quantity: integer("quantity").notNull().default(1),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reservationsRelations = relations(reservationsTable, ({ one }) => ({
  product: one(productsTable, {
    fields: [reservationsTable.productId],
    references: [productsTable.id],
  }),
  order: one(ordersTable, {
    fields: [reservationsTable.orderId],
    references: [ordersTable.id],
  }),
}));

export const insertReservationSchema = createInsertSchema(reservationsTable).omit({ id: true, createdAt: true });
export type InsertReservation = z.infer<typeof insertReservationSchema>;
export type Reservation = typeof reservationsTable.$inferSelect;
