import { Router, type IRouter } from "express";
import { eq, and, sql, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  productsTable,
  categoriesTable,
  productImagesTable,
  tariffsTable,
} from "@workspace/db";
import {
  ListProductsResponse,
  GetProductParams,
  GetProductResponse,
  ListCategoriesResponse,
  ListProductsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/catalog", async (req, res): Promise<void> => {
  const query = ListProductsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { category, capacity, construction_type, featured } = query.data;

  const conditions = [eq(productsTable.active, true)];
  if (category) {
    conditions.push(eq(categoriesTable.slug, category));
  }
  if (capacity) {
    conditions.push(eq(productsTable.capacity, parseInt(capacity)));
  }
  if (construction_type) {
    conditions.push(eq(productsTable.constructionType, construction_type));
  }
  if (featured === "true") {
    conditions.push(eq(productsTable.featured, true));
  }

  const products = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      slug: productsTable.slug,
      sku: productsTable.sku,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      shortDescription: productsTable.shortDescription,
      capacity: productsTable.capacity,
      constructionType: productsTable.constructionType,
      weight: productsTable.weight,
      dimensions: productsTable.dimensions,
      depositAmount: productsTable.depositAmount,
      featured: productsTable.featured,
      badge: productsTable.badge,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(and(...conditions))
    .orderBy(productsTable.sortOrder, productsTable.name);

  const productIds = products.map((p) => p.id);

  const images =
    productIds.length > 0
      ? await db
          .select()
          .from(productImagesTable)
          .where(inArray(productImagesTable.productId, productIds))
          .orderBy(productImagesTable.sortOrder)
      : [];

  const tariffs =
    productIds.length > 0
      ? await db
          .select()
          .from(tariffsTable)
          .where(
            and(
              inArray(tariffsTable.productId, productIds),
              eq(tariffsTable.active, true),
            ),
          )
      : [];

  const result = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku ?? null,
    categoryId: p.categoryId,
    categoryName: p.categoryName ?? "",
    shortDescription: p.shortDescription ?? null,
    capacity: p.capacity ?? null,
    constructionType: p.constructionType ?? null,
    weight: p.weight ?? null,
    dimensions: p.dimensions ?? null,
    depositAmount: p.depositAmount ? parseFloat(p.depositAmount) : null,
    featured: p.featured,
    badge: p.badge ?? null,
    mainImage:
      images.find((i) => i.productId === p.id && i.sortOrder === 0)?.url ??
      images.find((i) => i.productId === p.id)?.url ??
      null,
    tariffs: tariffs
      .filter((t) => t.productId === p.id)
      .map((t) => ({
        id: t.id,
        type: t.type,
        label: t.label,
        pricePerDay: parseFloat(t.pricePerDay),
        minDays: t.minDays ?? null,
        description: t.description ?? null,
      })),
  }));

  res.json(ListProductsResponse.parse(result));
});

router.get("/catalog/:slug", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [product] = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      slug: productsTable.slug,
      sku: productsTable.sku,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      shortDescription: productsTable.shortDescription,
      fullDescription: productsTable.fullDescription,
      capacity: productsTable.capacity,
      constructionType: productsTable.constructionType,
      weight: productsTable.weight,
      dimensions: productsTable.dimensions,
      kit: productsTable.kit,
      depositAmount: productsTable.depositAmount,
      featured: productsTable.featured,
      badge: productsTable.badge,
      metaTitle: productsTable.metaTitle,
      metaDescription: productsTable.metaDescription,
      h1: productsTable.h1,
      ogTitle: productsTable.ogTitle,
      ogDescription: productsTable.ogDescription,
      canonicalUrl: productsTable.canonicalUrl,
      specifications: productsTable.specifications,
      active: productsTable.active,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.slug, params.data.slug));

  if (!product || !product.active) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const images = await db
    .select()
    .from(productImagesTable)
    .where(eq(productImagesTable.productId, product.id))
    .orderBy(productImagesTable.sortOrder);

  const tariffs = await db
    .select()
    .from(tariffsTable)
    .where(and(eq(tariffsTable.productId, product.id), eq(tariffsTable.active, true)));

  const result = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku ?? null,
    categoryId: product.categoryId,
    categoryName: product.categoryName ?? "",
    shortDescription: product.shortDescription ?? null,
    fullDescription: product.fullDescription ?? null,
    capacity: product.capacity ?? null,
    constructionType: product.constructionType ?? null,
    weight: product.weight ?? null,
    dimensions: product.dimensions ?? null,
    kit: product.kit ?? null,
    depositAmount: product.depositAmount ? parseFloat(product.depositAmount) : null,
    featured: product.featured,
    badge: product.badge ?? null,
    metaTitle: product.metaTitle ?? null,
    metaDescription: product.metaDescription ?? null,
    h1: product.h1 ?? null,
    ogTitle: product.ogTitle ?? null,
    ogDescription: product.ogDescription ?? null,
    canonicalUrl: product.canonicalUrl ?? null,
    images: images.map((i) => ({
      id: i.id,
      url: i.url,
      alt: i.alt ?? null,
      sortOrder: i.sortOrder,
    })),
    tariffs: tariffs.map((t) => ({
      id: t.id,
      type: t.type,
      label: t.label,
      pricePerDay: parseFloat(t.pricePerDay),
      minDays: t.minDays ?? null,
      description: t.description ?? null,
    })),
    specifications: product.specifications ?? {},
  };

  res.json(GetProductResponse.parse(result));
});

router.get("/categories", async (_req, res): Promise<void> => {
  const categories = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      description: categoriesTable.description,
      h1: categoriesTable.h1,
      metaTitle: categoriesTable.metaTitle,
      metaDescription: categoriesTable.metaDescription,
      productCount: sql<number>`COUNT(DISTINCT ${productsTable.id})`,
    })
    .from(categoriesTable)
    .leftJoin(
      productsTable,
      and(
        eq(productsTable.categoryId, categoriesTable.id),
        eq(productsTable.active, true),
      ),
    )
    .where(eq(categoriesTable.active, true))
    .groupBy(categoriesTable.id)
    .orderBy(categoriesTable.sortOrder, categoriesTable.name);

  const result = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description ?? null,
    h1: c.h1 ?? null,
    metaTitle: c.metaTitle ?? null,
    metaDescription: c.metaDescription ?? null,
    productCount: Number(c.productCount),
  }));

  res.json(ListCategoriesResponse.parse(result));
});

export default router;
