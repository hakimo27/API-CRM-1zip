import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { inventoryUnitsTable, productsTable } from "@workspace/db";
import {
  AdminListInventoryQueryParams,
  AdminListInventoryResponse,
  AdminUpdateInventoryParams,
  AdminUpdateInventoryBody,
  AdminUpdateInventoryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/admin/inventory", async (req, res): Promise<void> => {
  const query = AdminListInventoryQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { status, product_id } = query.data;
  const conditions: any[] = [];
  if (status) conditions.push(eq(inventoryUnitsTable.status, status as any));
  if (product_id) conditions.push(eq(inventoryUnitsTable.productId, product_id));

  const units = await db
    .select({
      id: inventoryUnitsTable.id,
      productId: inventoryUnitsTable.productId,
      productName: productsTable.name,
      serialNumber: inventoryUnitsTable.serialNumber,
      status: inventoryUnitsTable.status,
      condition: inventoryUnitsTable.condition,
      warehouseLocation: inventoryUnitsTable.warehouseLocation,
      notes: inventoryUnitsTable.notes,
      createdAt: inventoryUnitsTable.createdAt,
    })
    .from(inventoryUnitsTable)
    .leftJoin(productsTable, eq(inventoryUnitsTable.productId, productsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(productsTable.name, inventoryUnitsTable.id);

  const result = units.map((u) => ({
    id: u.id,
    productId: u.productId,
    productName: u.productName ?? "Товар",
    serialNumber: u.serialNumber ?? null,
    status: u.status,
    condition: u.condition ?? null,
    warehouseLocation: u.warehouseLocation ?? null,
    notes: u.notes ?? null,
    createdAt: u.createdAt.toISOString(),
  }));

  res.json(AdminListInventoryResponse.parse(result));
});

router.patch("/admin/inventory/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const body = AdminUpdateInventoryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [unit] = await db
    .select()
    .from(inventoryUnitsTable)
    .where(eq(inventoryUnitsTable.id, id));

  if (!unit) {
    res.status(404).json({ error: "Inventory unit not found" });
    return;
  }

  const [updated] = await db
    .update(inventoryUnitsTable)
    .set({
      status: body.data.status as any,
      condition: body.data.condition ?? unit.condition,
      notes: body.data.notes ?? unit.notes,
      warehouseLocation: body.data.warehouseLocation ?? unit.warehouseLocation,
    })
    .where(eq(inventoryUnitsTable.id, id))
    .returning();

  const [product] = await db
    .select({ name: productsTable.name })
    .from(productsTable)
    .where(eq(productsTable.id, updated.productId));

  res.json(
    AdminUpdateInventoryResponse.parse({
      id: updated.id,
      productId: updated.productId,
      productName: product?.name ?? "Товар",
      serialNumber: updated.serialNumber ?? null,
      status: updated.status,
      condition: updated.condition ?? null,
      warehouseLocation: updated.warehouseLocation ?? null,
      notes: updated.notes ?? null,
      createdAt: updated.createdAt.toISOString(),
    }),
  );
});

export default router;
