import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { eq, asc, count } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import { categoriesTable, productsTable } from "@workspace/db";

type DrizzleDb = typeof import("@workspace/db").db;

@Injectable()
export class CategoriesService {
  constructor(@Inject(DB_TOKEN) private db: DrizzleDb) {}

  async findAll() {
    const cats = await this.db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.active, true))
      .orderBy(asc(categoriesTable.sortOrder));

    const counts = await this.db
      .select({ categoryId: productsTable.categoryId, cnt: count() })
      .from(productsTable)
      .where(eq(productsTable.active, true))
      .groupBy(productsTable.categoryId);

    const countMap: Record<number, number> = {};
    for (const c of counts) countMap[c.categoryId] = Number(c.cnt);

    return cats.map(cat => ({ ...cat, productCount: countMap[cat.id] ?? 0 }));
  }

  async findBySlug(slug: string) {
    const [category] = await this.db.select().from(categoriesTable).where(eq(categoriesTable.slug, slug)).limit(1);
    if (!category) throw new NotFoundException("Категория не найдена");
    return category;
  }

  async findById(id: number) {
    const [category] = await this.db.select().from(categoriesTable).where(eq(categoriesTable.id, id)).limit(1);
    if (!category) throw new NotFoundException("Категория не найдена");
    return category;
  }

  async create(data: typeof categoriesTable.$inferInsert) {
    const [created] = await this.db.insert(categoriesTable).values(data).returning();
    return created;
  }

  async update(id: number, data: Partial<typeof categoriesTable.$inferInsert>) {
    const [updated] = await this.db.update(categoriesTable).set(data).where(eq(categoriesTable.id, id)).returning();
    if (!updated) throw new NotFoundException("Категория не найдена");
    return updated;
  }

  async delete(id: number) {
    const [deleted] = await this.db.delete(categoriesTable).where(eq(categoriesTable.id, id)).returning({ id: categoriesTable.id });
    if (!deleted) throw new NotFoundException("Категория не найдена");
    return { message: "Категория удалена" };
  }
}
