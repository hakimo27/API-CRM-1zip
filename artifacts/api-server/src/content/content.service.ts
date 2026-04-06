import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { eq, and, desc, asc } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import { articlesTable, pagesTable, faqsTable, reviewsTable, riversTable } from "@workspace/db";
import { slugify, ensureUniqueSlug } from "../common/utils/slug.js";

type DrizzleDb = typeof import("@workspace/db").db;

@Injectable()
export class ContentService {
  constructor(@Inject(DB_TOKEN) private db: DrizzleDb) {}

  // ─── Articles ───────────────────────────────────────────────────────────────

  async getArticles(params: { status?: string; search?: string; page?: number; limit?: number }) {
    const { status = "published", search, page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;

    let articles = await this.db
      .select()
      .from(articlesTable)
      .where(status ? eq(articlesTable.status, status as any) : undefined)
      .orderBy(desc(articlesTable.publishedAt))
      .limit(limit)
      .offset(offset);

    if (search) {
      const s = search.toLowerCase();
      articles = articles.filter(
        (a) =>
          a.title.toLowerCase().includes(s) ||
          (a.excerpt || "").toLowerCase().includes(s)
      );
    }

    return articles;
  }

  async getArticleBySlug(slug: string) {
    const [article] = await this.db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.slug, slug))
      .limit(1);
    if (!article) throw new NotFoundException("Статья не найдена");
    return article;
  }

  async createArticle(data: any) {
    const baseSlug = data.slug?.trim() ? slugify(data.slug) : slugify(data.title || "");
    data.slug = await ensureUniqueSlug(this.db, articlesTable, articlesTable.slug, baseSlug);
    const [created] = await this.db.insert(articlesTable).values(data).returning();
    return created;
  }

  async updateArticle(id: number, data: any) {
    if (data.slug !== undefined) {
      const base = data.slug?.trim() ? slugify(data.slug) : slugify(data.title || "");
      data.slug = await ensureUniqueSlug(this.db, articlesTable, articlesTable.slug, base, id);
    }
    const [updated] = await this.db
      .update(articlesTable)
      .set(data)
      .where(eq(articlesTable.id, id))
      .returning();
    if (!updated) throw new NotFoundException("Статья не найдена");
    return updated;
  }

  async deleteArticle(id: number) {
    const [deleted] = await this.db
      .delete(articlesTable)
      .where(eq(articlesTable.id, id))
      .returning({ id: articlesTable.id });
    if (!deleted) throw new NotFoundException("Статья не найдена");
    return { message: "Статья удалена" };
  }

  // ─── Pages ──────────────────────────────────────────────────────────────────

  async getPages() {
    return this.db.select().from(pagesTable).where(eq(pagesTable.active, true));
  }

  async getPageBySlug(slug: string) {
    const [page] = await this.db
      .select()
      .from(pagesTable)
      .where(eq(pagesTable.slug, slug))
      .limit(1);
    if (!page) throw new NotFoundException("Страница не найдена");
    return page;
  }

  async upsertPage(slug: string, data: any) {
    const [existing] = await this.db
      .select({ id: pagesTable.id })
      .from(pagesTable)
      .where(eq(pagesTable.slug, slug))
      .limit(1);

    if (existing) {
      const [updated] = await this.db.update(pagesTable).set(data).where(eq(pagesTable.id, existing.id)).returning();
      return updated;
    } else {
      const [created] = await this.db.insert(pagesTable).values({ ...data, slug }).returning();
      return created;
    }
  }

  // ─── FAQs ───────────────────────────────────────────────────────────────────

  async getFaqs(category?: string) {
    let faqs = await this.db.select().from(faqsTable).where(eq(faqsTable.active, true)).orderBy(asc(faqsTable.sortOrder));
    if (category) faqs = faqs.filter((f) => f.category === category);
    return faqs;
  }

  async createFaq(data: any) {
    const [created] = await this.db.insert(faqsTable).values(data).returning();
    return created;
  }

  async updateFaq(id: number, data: any) {
    const [updated] = await this.db.update(faqsTable).set(data).where(eq(faqsTable.id, id)).returning();
    if (!updated) throw new NotFoundException("FAQ не найден");
    return updated;
  }

  async deleteFaq(id: number) {
    await this.db.delete(faqsTable).where(eq(faqsTable.id, id));
    return { message: "FAQ удалён" };
  }

  // ─── Reviews ────────────────────────────────────────────────────────────────

  async getReviews(params: { onlyApproved?: boolean; featured?: boolean }) {
    const { onlyApproved = true, featured } = params;
    let reviews = await this.db
      .select()
      .from(reviewsTable)
      .where(onlyApproved ? eq(reviewsTable.status, "approved") : undefined)
      .orderBy(asc(reviewsTable.sortOrder), desc(reviewsTable.createdAt));
    if (featured !== undefined) reviews = reviews.filter((r) => r.featured === featured);
    return reviews;
  }

  async createReview(data: any) {
    const [created] = await this.db
      .insert(reviewsTable)
      .values({
        ...data,
        status: data.status ?? "pending",
        published: data.published ?? false,
      })
      .returning();
    return created;
  }

  async createReviewAdmin(data: any) {
    return this.createReview(data);
  }

  async approveReview(id: number) {
    const [updated] = await this.db
      .update(reviewsTable)
      .set({ status: "approved", published: true })
      .where(eq(reviewsTable.id, id))
      .returning();
    if (!updated) throw new NotFoundException("Отзыв не найден");
    return updated;
  }

  async deleteReview(id: number) {
    await this.db.delete(reviewsTable).where(eq(reviewsTable.id, id));
    return { message: "Отзыв удалён" };
  }

  // ─── Rivers ─────────────────────────────────────────────────────────────────

  async getRivers() {
    return this.db.select().from(riversTable).where(eq(riversTable.active, true)).orderBy(asc(riversTable.sortOrder));
  }

  async getRiverBySlug(slug: string) {
    const [river] = await this.db
      .select()
      .from(riversTable)
      .where(eq(riversTable.slug, slug))
      .limit(1);
    if (!river) throw new NotFoundException("Река не найдена");
    return river;
  }

  async createPage(data: any) {
    const baseSlug = data.slug?.trim() ? slugify(data.slug) : slugify(data.title || "");
    data.slug = await ensureUniqueSlug(this.db, pagesTable, pagesTable.slug, baseSlug);
    const [created] = await this.db.insert(pagesTable).values(data).returning();
    return created;
  }

  async updatePage(id: number, data: any) {
    if (data.slug !== undefined) {
      const base = data.slug?.trim() ? slugify(data.slug) : slugify(data.title || "");
      data.slug = await ensureUniqueSlug(this.db, pagesTable, pagesTable.slug, base, id);
    }
    const [updated] = await this.db.update(pagesTable).set({ ...data, updatedAt: new Date() }).where(eq(pagesTable.id, id)).returning();
    if (!updated) throw new NotFoundException("Страница не найдена");
    return updated;
  }

  async deletePage(id: number) {
    const [deleted] = await this.db.delete(pagesTable).where(eq(pagesTable.id, id)).returning({ id: pagesTable.id });
    if (!deleted) throw new NotFoundException("Страница не найдена");
    return { message: "Страница удалена" };
  }

  async getPagesAdmin() {
    return this.db.select().from(pagesTable).orderBy(pagesTable.slug);
  }

  async updateReview(id: number, data: any) {
    const [updated] = await this.db.update(reviewsTable).set({ ...data, updatedAt: new Date() }).where(eq(reviewsTable.id, id)).returning();
    if (!updated) throw new NotFoundException("Отзыв не найден");
    return updated;
  }

  async createRiver(data: any) {
    const baseSlug = data.slug?.trim() ? slugify(data.slug) : slugify(data.name || data.title || "");
    data.slug = await ensureUniqueSlug(this.db, riversTable, riversTable.slug, baseSlug);
    const [created] = await this.db.insert(riversTable).values(data).returning();
    return created;
  }

  async updateRiver(id: number, data: any) {
    if (data.slug !== undefined) {
      const base = data.slug?.trim() ? slugify(data.slug) : slugify(data.name || data.title || "");
      data.slug = await ensureUniqueSlug(this.db, riversTable, riversTable.slug, base, id);
    }
    const [updated] = await this.db.update(riversTable).set(data).where(eq(riversTable.id, id)).returning();
    if (!updated) throw new NotFoundException("Река не найдена");
    return updated;
  }
}
