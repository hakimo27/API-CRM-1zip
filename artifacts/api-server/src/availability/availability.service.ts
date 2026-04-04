import { Injectable, Inject } from "@nestjs/common";
import { and, eq, not, inArray, lt, gt } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import {
  inventoryUnitsTable,
  ordersTable,
  orderItemsTable,
  productsTable,
} from "@workspace/db";

type DrizzleDb = typeof import("@workspace/db").db;

export interface AvailabilityResult {
  productId: number;
  productName: string;
  available: boolean;
  totalUnits: number;
  availableUnits: number;
  requestedQuantity: number;
  startDate: string;
  endDate: string;
}

@Injectable()
export class AvailabilityService {
  constructor(@Inject(DB_TOKEN) private db: DrizzleDb) {}

  private readonly BLOCKED_STATUSES = ["cancelled", "completed", "refunded"];

  async checkAvailability(
    productId: number,
    startDate: Date,
    endDate: Date,
    quantity = 1,
    productName?: string
  ): Promise<AvailabilityResult> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const name = productName ?? `Товар #${productId}`;

    // Physical inventory units in "available" status
    const allUnits = await this.db
      .select()
      .from(inventoryUnitsTable)
      .where(
        and(
          eq(inventoryUnitsTable.productId, productId),
          eq(inventoryUnitsTable.status, "available")
        )
      );

    // Conflicting order items on overlapping dates (active orders only)
    const conflicting = await this.db
      .select({
        unitId: orderItemsTable.inventoryUnitId,
        qty: orderItemsTable.quantity,
      })
      .from(orderItemsTable)
      .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
      .where(
        and(
          eq(orderItemsTable.productId, productId),
          not(inArray(ordersTable.status, this.BLOCKED_STATUSES)),
          lt(orderItemsTable.startDate, end),
          gt(orderItemsTable.endDate, start)
        )
      );

    const reservedUnitIds = conflicting
      .map((c) => c.unitId)
      .filter(Boolean) as number[];

    // Orders without explicit unit assignment counted by quantity
    const unassignedConflictQty = conflicting
      .filter((c) => !c.unitId)
      .reduce((s, c) => s + (c.qty ?? 1), 0);

    let totalUnits: number;
    let availableCount: number;

    if (allUnits.length > 0) {
      // Unit-based: physical inventory units are tracked
      const freeUnits = allUnits.filter((u) => !reservedUnitIds.includes(u.id));
      totalUnits = allUnits.length;
      availableCount = Math.max(0, freeUnits.length - unassignedConflictQty);
    } else {
      // Fallback: no physical units — use product.totalStock
      const [product] = await this.db
        .select({ totalStock: productsTable.totalStock })
        .from(productsTable)
        .where(eq(productsTable.id, productId))
        .limit(1);

      const totalStock = product?.totalStock ?? 0;
      const totalConflictQty = reservedUnitIds.length + unassignedConflictQty;
      totalUnits = totalStock;
      availableCount = Math.max(0, totalStock - totalConflictQty);
    }

    return {
      productId,
      productName: name,
      available: availableCount >= quantity,
      totalUnits,
      availableUnits: availableCount,
      requestedQuantity: quantity,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }

  async getAvailableUnits(productId: number, startDate: Date, endDate: Date) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const allUnits = await this.db
      .select()
      .from(inventoryUnitsTable)
      .where(
        and(
          eq(inventoryUnitsTable.productId, productId),
          eq(inventoryUnitsTable.status, "available")
        )
      );

    const conflicting = await this.db
      .select({ unitId: orderItemsTable.inventoryUnitId })
      .from(orderItemsTable)
      .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
      .where(
        and(
          eq(orderItemsTable.productId, productId),
          not(inArray(ordersTable.status, this.BLOCKED_STATUSES)),
          lt(orderItemsTable.startDate, end),
          gt(orderItemsTable.endDate, start)
        )
      );

    const reservedIds = conflicting
      .map((c) => c.unitId)
      .filter(Boolean) as number[];

    return allUnits.filter((u) => !reservedIds.includes(u.id));
  }

  async checkMultipleProducts(
    items: Array<{ productId: number; quantity: number }>,
    startDate: Date,
    endDate: Date
  ) {
    const productIds = items.map((i) => i.productId);
    const products = await this.db
      .select({ id: productsTable.id, name: productsTable.name })
      .from(productsTable)
      .where(inArray(productsTable.id, productIds));

    const nameMap = new Map(products.map((p) => [p.id, p.name]));

    const results = await Promise.all(
      items.map(({ productId, quantity }) =>
        this.checkAvailability(
          productId,
          startDate,
          endDate,
          quantity,
          nameMap.get(productId) ?? `Товар #${productId}`
        )
      )
    );

    return {
      allAvailable: results.every((r) => r.available),
      items: results,
    };
  }

  /** Used by CRM: detailed availability info for a single product */
  async getProductAvailabilityInfo(
    productId: number,
    startDate: Date,
    endDate: Date,
    quantity = 1
  ): Promise<AvailabilityResult> {
    const [product] = await this.db
      .select({ id: productsTable.id, name: productsTable.name })
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .limit(1);

    return this.checkAvailability(
      productId,
      startDate,
      endDate,
      quantity,
      product?.name
    );
  }
}
