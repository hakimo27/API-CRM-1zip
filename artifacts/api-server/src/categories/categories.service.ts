import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { eq, asc } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import { categoriesTable } from "@workspace/db";

type DrizzleDb = typeof import("@workspace/db").db;

@Injectable()
export class CategoriesService {
  constructor(@Inject(DB_TOKEN) private db: DrizzleDb) {}

  async findAll() {
    return this.db.select().from(categoriesTable).where(eq(categoriesTable.active, true)).orderBy(asc(categoriesTable.sortOrder));
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
