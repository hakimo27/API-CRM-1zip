import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { eq, and, asc, desc, like, or, inArray } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import { productsTable, productImagesTable, tariffsTable, categoriesTable } from "@workspace/db";

type DrizzleDb = typeof import("@workspace/db").db;

@Injectable()
export class ProductsService {
  constructor(@Inject(DB_TOKEN) private db: DrizzleDb) {}

  async findAll(params: {
    categoryId?: number;
    categorySlug?: string;
    active?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { categoryId, categorySlug, active = true, search, page = 1, limit = 50 } = params;
    const offset = (page - 1) * limit;

    let categoryFilter: number | undefined = categoryId;
    if (categorySlug && !categoryId) {
      const [cat] = await this.db
        .select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(eq(categoriesTable.slug, categorySlug))
        .limit(1);
      categoryFilter = cat?.id;
    }

    const conditions = [];
    if (active !== undefined) conditions.push(eq(productsTable.active, active));
    if (categoryFilter) conditions.push(eq(productsTable.categoryId, categoryFilter));
    if (search) {
      conditions.push(
        or(
          like(productsTable.name, `%${search}%`),
          like(productsTable.sku || "", `%${search}%`)
        )
      );
    }

    const products = await this.db
      .select()
      .from(productsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(productsTable.sortOrder), asc(productsTable.name))
      .limit(limit)
      .offset(offset);

    const productIds = products.map((p) => p.id);
    if (productIds.length === 0) return [];

    const [images, tariffs] = await Promise.all([
      this.db.select().from(productImagesTable).where(inArray(productImagesTable.productId, productIds)).orderBy(asc(productImagesTable.sortOrder)),
      this.db.select().from(tariffsTable).where(inArray(tariffsTable.productId, productIds)),
    ]);

    return products.map((p) => ({
      ...p,
      images: images.filter((img) => img.productId === p.id),
      tariffs: tariffs.filter((t) => t.productId === p.id),
    }));
  }

  async findBySlug(slug: string) {
    const [product] = await this.db
      .select()
      .from(productsTable)
      .where(eq(productsTable.slug, slug))
      .limit(1);

    if (!product) throw new NotFoundException("Товар не найден");

    const [images, tariffs, category] = await Promise.all([
      this.db.select().from(productImagesTable).where(eq(productImagesTable.productId, product.id)).orderBy(asc(productImagesTable.sortOrder)),
      this.db.select().from(tariffsTable).where(eq(tariffsTable.productId, product.id)),
      this.db.select().from(categoriesTable).where(eq(categoriesTable.id, product.categoryId)).limit(1),
    ]);

    return { ...product, images, tariffs, category: category[0] || null };
  }

  async findById(id: number) {
    const [product] = await this.db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!product) throw new NotFoundException("Товар не найден");
    const [images, tariffs] = await Promise.all([
      this.db.select().from(productImagesTable).where(eq(productImagesTable.productId, id)).orderBy(asc(productImagesTable.sortOrder)),
      this.db.select().from(tariffsTable).where(eq(tariffsTable.productId, id)),
    ]);
    return { ...product, images, tariffs };
  }

  async create(data: any) {
    const { tariffs, ...productData } = data;
    const [created] = await this.db.insert(productsTable).values(productData).returning();
    if (tariffs?.length) {
      await this.db.insert(tariffsTable).values(
        tariffs.map((t: any) => ({ ...t, productId: created.id }))
      );
    }
    return this.findById(created.id);
  }

  async update(id: number, data: any) {
    const { tariffs, ...productData } = data;
    const [updated] = await this.db.update(productsTable).set(productData).where(eq(productsTable.id, id)).returning();
    if (!updated) throw new NotFoundException("Товар не найден");
    if (tariffs !== undefined) {
      await this.db.delete(tariffsTable).where(eq(tariffsTable.productId, id));
      if (tariffs.length > 0) {
        await this.db.insert(tariffsTable).values(
          tariffs.map((t: any) => ({ type: t.type, label: t.label, pricePerDay: t.pricePerDay, minDays: t.minDays || null, description: t.description || null, productId: id }))
        );
      }
    }
    return this.findById(id);
  }

  async delete(id: number) {
    const [deleted] = await this.db.delete(productsTable).where(eq(productsTable.id, id)).returning({ id: productsTable.id });
    if (!deleted) throw new NotFoundException("Товар не найден");
    return { message: "Товар удалён" };
  }

  async syncImages(productId: number, urls: string[]) {
    await this.findById(productId);
    await this.db.delete(productImagesTable).where(eq(productImagesTable.productId, productId));
    if (urls.length > 0) {
      await this.db.insert(productImagesTable).values(
        urls.map((url: string, idx: number) => ({ productId, url, alt: null, sortOrder: idx }))
      );
    }
    return { message: "Изображения обновлены" };
  }

  async updateStock(productId: number, delta: number) {
    const [product] = await this.db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
    if (!product) throw new NotFoundException("Товар не найден");
    const newStock = Math.max(0, (product.totalStock || 0) + delta);
    await this.db.update(productsTable).set({ totalStock: newStock }).where(eq(productsTable.id, productId));
  }
}
