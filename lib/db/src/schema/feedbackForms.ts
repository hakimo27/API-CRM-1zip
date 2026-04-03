import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cheaperPriceReportsTable = pgTable("cheaper_price_reports", {
  id: serial("id").primaryKey(),
  productId: integer("product_id"),
  name: text("name").notNull(),
  contact: text("contact").notNull(),
  competitorUrl: text("competitor_url"),
  competitorPrice: numeric("competitor_price", { precision: 10, scale: 2 }),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const feedbackReportsTable = pgTable("feedback_reports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contact: text("contact").notNull(),
  message: text("message").notNull(),
  pageUrl: text("page_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCheaperPriceReportSchema = createInsertSchema(cheaperPriceReportsTable).omit({ id: true, createdAt: true });
export type InsertCheaperPriceReport = z.infer<typeof insertCheaperPriceReportSchema>;
export type CheaperPriceReport = typeof cheaperPriceReportsTable.$inferSelect;

export const insertFeedbackReportSchema = createInsertSchema(feedbackReportsTable).omit({ id: true, createdAt: true });
export type InsertFeedbackReport = z.infer<typeof insertFeedbackReportSchema>;
export type FeedbackReport = typeof feedbackReportsTable.$inferSelect;
