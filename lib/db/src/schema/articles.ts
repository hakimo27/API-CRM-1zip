import { pgTable, text, serial, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const ARTICLE_STATUSES = ["draft", "published", "archived"] as const;
export type ArticleStatus = typeof ARTICLE_STATUSES[number];

export const articlesTable = pgTable("articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull().default(""),
  authorId: integer("author_id").references(() => usersTable.id),
  categoryId: integer("category_id"),
  mainImage: text("main_image"),
  gallery: jsonb("gallery").$type<string[]>().default([]),
  tags: jsonb("tags").$type<string[]>().default([]),
  status: text("status").$type<ArticleStatus>().notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  viewCount: integer("view_count").notNull().default(0),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const riversTable = pgTable("rivers", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  region: text("region"),
  description: text("description").notNull().default(""),
  difficulty: integer("difficulty").default(3),
  length: integer("length"),
  mainImage: text("main_image"),
  gallery: jsonb("gallery").$type<string[]>().default([]),
  features: jsonb("features").$type<string[]>().default([]),
  season: text("season"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").default(0),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const faqsTable = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category").default("general"),
  sortOrder: integer("sort_order").default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const pagesTable = pgTable("pages", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull().default(""),
  active: boolean("active").notNull().default(true),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export type ReviewStatus = typeof REVIEW_STATUSES[number];

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  authorName: text("author_name").notNull(),
  authorLastName: text("author_last_name"),
  authorEmail: text("author_email"),
  authorAvatar: text("author_avatar"),
  authorCity: text("author_city"),
  rating: integer("rating").notNull().default(5),
  title: text("title"),
  text: text("text").notNull(),
  reviewDate: timestamp("review_date", { withTimezone: true }),
  tourId: integer("tour_id"),
  orderId: integer("order_id"),
  productId: integer("product_id"),
  saleOrderId: integer("sale_order_id"),
  customerId: integer("customer_id"),
  status: text("status").$type<ReviewStatus>().notNull().default("pending"),
  featured: boolean("featured").notNull().default(false),
  published: boolean("published").notNull().default(false),
  source: text("source").default("site"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const articlesRelations = relations(articlesTable, ({ one }) => ({
  author: one(usersTable, {
    fields: [articlesTable.authorId],
    references: [usersTable.id],
  }),
}));

export const insertArticleSchema = createInsertSchema(articlesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articlesTable.$inferSelect;
export type River = typeof riversTable.$inferSelect;
export type Faq = typeof faqsTable.$inferSelect;
export type Page = typeof pagesTable.$inferSelect;
export type Review = typeof reviewsTable.$inferSelect;
