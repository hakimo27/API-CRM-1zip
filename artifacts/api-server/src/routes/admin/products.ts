import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { productsTable, categoriesTable } from "@workspace/db";
import {
  AdminListProductsResponse,
  AdminCreateProductBody,
  AdminUpdateProductParams,
  AdminUpdateProductBody,
  AdminUpdateProductResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/admin/products", async (_req, res): Promise<void> => {
  const products = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      slug: productsTable.slug,
      sku: productsTable.sku,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      active: productsTable.active,
      featured: productsTable.featured,
      depositAmount: productsTable.depositAmount,
      capacity: productsTable.capacity,
      constructionType: productsTable.constructionType,
      badge: productsTable.badge,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .orderBy(productsTable.sortOrder, productsTable.name);

  const result = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku ?? null,
    categoryId: p.categoryId,
    categoryName: p.categoryName ?? "",
    active: p.active,
    featured: p.featured,
    depositAmount: p.depositAmount ? parseFloat(p.depositAmount) : null,
    capacity: p.capacity ?? null,
    constructionType: p.constructionType ?? null,
    badge: p.badge ?? null,
    createdAt: p.createdAt.toISOString(),
  }));

  res.json(AdminListProductsResponse.parse(result));
});

router.post("/admin/products", async (req, res): Promise<void> => {
  const parsed = AdminCreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [product] = await db
    .insert(productsTable)
    .values({
      ...parsed.data,
      depositAmount: parsed.data.depositAmount != null ? String(parsed.data.depositAmount) : null,
    })
    .returning();

  const [category] = await db
    .select({ name: categoriesTable.name })
    .from(categoriesTable)
    .where(eq(categoriesTable.id, product.categoryId));

  res.status(201).json({
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku ?? null,
    categoryId: product.categoryId,
    categoryName: category?.name ?? "",
    active: product.active,
    featured: product.featured,
    depositAmount: product.depositAmount ? parseFloat(product.depositAmount) : null,
    capacity: product.capacity ?? null,
    constructionType: product.constructionType ?? null,
    badge: product.badge ?? null,
    createdAt: product.createdAt.toISOString(),
  });
});

router.patch("/admin/products/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const parsed = AdminUpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [product] = await db
    .update(productsTable)
    .set({
      ...parsed.data,
      depositAmount: parsed.data.depositAmount != null ? String(parsed.data.depositAmount) : undefined,
    })
    .where(eq(productsTable.id, id))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const [category] = await db
    .select({ name: categoriesTable.name })
    .from(categoriesTable)
    .where(eq(categoriesTable.id, product.categoryId));

  res.json(
    AdminUpdateProductResponse.parse({
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku ?? null,
      categoryId: product.categoryId,
      categoryName: category?.name ?? "",
      active: product.active,
      featured: product.featured,
      depositAmount: product.depositAmount ? parseFloat(product.depositAmount) : null,
      capacity: product.capacity ?? null,
      constructionType: product.constructionType ?? null,
      badge: product.badge ?? null,
      createdAt: product.createdAt.toISOString(),
    }),
  );
});

export default router;
