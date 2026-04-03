import { pgTable, text, serial, timestamp, boolean, integer, numeric, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const TOUR_TYPES = ["rafting", "kayak_tour", "instruction", "excursion"] as const;
export type TourType = (typeof TOUR_TYPES)[number];

export const TOUR_DIFFICULTIES = ["easy", "medium", "hard", "extreme"] as const;
export type TourDifficulty = (typeof TOUR_DIFFICULTIES)[number];

export const TOUR_DATE_STATUSES = ["planned", "active", "completed", "cancelled"] as const;
export type TourDateStatus = (typeof TOUR_DATE_STATUSES)[number];

export const TOUR_BOOKING_STATUSES = ["pending", "confirmed", "completed", "cancelled"] as const;
export type TourBookingStatus = (typeof TOUR_BOOKING_STATUSES)[number];

export const toursTable = pgTable("tours", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  type: text("type").$type<TourType>().notNull().default("rafting"),
  region: text("region"),
  riverId: integer("river_id"),
  duration: integer("duration").notNull().default(1),
  difficulty: text("difficulty").$type<TourDifficulty>().default("medium"),
  minParticipants: integer("min_participants").notNull().default(1),
  maxParticipants: integer("max_participants").notNull().default(10),
  basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull().default("0"),
  depositAmount: numeric("deposit_amount", { precision: 10, scale: 2 }).default("0"),
  description: text("description"),
  program: text("program"),
  equipment: text("equipment"),
  requirements: text("requirements"),
  includes: jsonb("includes").$type<string[]>().default([]),
  excludes: jsonb("excludes").$type<string[]>().default([]),
  mainImage: text("main_image"),
  gallery: jsonb("gallery").$type<string[]>().default([]),
  active: boolean("active").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const tourDatesTable = pgTable("tour_dates", {
  id: serial("id").primaryKey(),
  tourId: integer("tour_id").notNull().references(() => toursTable.id, { onDelete: "cascade" }),
  instructorId: integer("instructor_id").references(() => usersTable.id),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  seatsTotal: integer("seats_total").notNull().default(10),
  seatsBooked: integer("seats_booked").notNull().default(0),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  depositAmount: numeric("deposit_amount", { precision: 10, scale: 2 }).default("0"),
  status: text("status").$type<TourDateStatus>().notNull().default("planned"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const tourBookingsTable = pgTable("tour_bookings", {
  id: serial("id").primaryKey(),
  tourDateId: integer("tour_date_id").notNull().references(() => tourDatesTable.id),
  userId: integer("user_id").references(() => usersTable.id),
  participantCount: integer("participant_count").notNull().default(1),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  depositPaid: boolean("deposit_paid").notNull().default(false),
  status: text("status").$type<TourBookingStatus>().notNull().default("pending"),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  contactEmail: text("contact_email"),
  participants: jsonb("participants").$type<Array<{ name: string; age?: number }>>().default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const toursRelations = relations(toursTable, ({ many }) => ({
  dates: many(tourDatesTable),
}));

export const tourDatesRelations = relations(tourDatesTable, ({ one, many }) => ({
  tour: one(toursTable, {
    fields: [tourDatesTable.tourId],
    references: [toursTable.id],
  }),
  instructor: one(usersTable, {
    fields: [tourDatesTable.instructorId],
    references: [usersTable.id],
  }),
  bookings: many(tourBookingsTable),
}));

export const tourBookingsRelations = relations(tourBookingsTable, ({ one }) => ({
  tourDate: one(tourDatesTable, {
    fields: [tourBookingsTable.tourDateId],
    references: [tourDatesTable.id],
  }),
  user: one(usersTable, {
    fields: [tourBookingsTable.userId],
    references: [usersTable.id],
  }),
}));

export const insertTourSchema = createInsertSchema(toursTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTour = z.infer<typeof insertTourSchema>;
export type Tour = typeof toursTable.$inferSelect;
export type TourDate = typeof tourDatesTable.$inferSelect;
export type TourBooking = typeof tourBookingsTable.$inferSelect;
