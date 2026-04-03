import { Injectable, Inject } from "@nestjs/common";
import { and, eq, or, lt, gt, not, inArray } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import { inventoryUnitsTable, reservationsTable, ordersTable, orderItemsTable } from "@workspace/db";

type DrizzleDb = typeof import("@workspace/db").db;

@Injectable()
export class AvailabilityService {
  constructor(@Inject(DB_TOKEN) private db: DrizzleDb) {}

  async checkAvailability(productId: number, startDate: Date, endDate: Date, quantity = 1) {
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

    const conflictingOrders = await this.db
      .select({ itemId: orderItemsTable.id, unitId: orderItemsTable.inventoryUnitId })
      .from(orderItemsTable)
      .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
      .where(
        and(
          eq(orderItemsTable.productId, productId),
          not(inArray(ordersTable.status, ["cancelled", "completed", "refunded"])),
          lt(orderItemsTable.startDate, end),
          gt(orderItemsTable.endDate, start)
        )
      );

    const reservedUnitIds = conflictingOrders
      .map((o) => o.unitId)
      .filter(Boolean) as number[];

    const availableUnits = allUnits.filter((u) => !reservedUnitIds.includes(u.id));

    return {
      available: availableUnits.length >= quantity,
      totalUnits: allUnits.length,
      availableUnits: availableUnits.length,
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

    const conflictingItems = await this.db
      .select({ unitId: orderItemsTable.inventoryUnitId })
      .from(orderItemsTable)
      .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
      .where(
        and(
          eq(orderItemsTable.productId, productId),
          not(inArray(ordersTable.status, ["cancelled", "completed", "refunded"])),
          lt(orderItemsTable.startDate, end),
          gt(orderItemsTable.endDate, start)
        )
      );

    const reservedIds = conflictingItems.map((c) => c.unitId).filter(Boolean) as number[];
    return allUnits.filter((u) => !reservedIds.includes(u.id));
  }

  async checkMultipleProducts(
    items: Array<{ productId: number; quantity: number }>,
    startDate: Date,
    endDate: Date
  ) {
    const results = await Promise.all(
      items.map(async ({ productId, quantity }) => ({
        productId,
        quantity,
        ...(await this.checkAvailability(productId, startDate, endDate, quantity)),
      }))
    );

    const allAvailable = results.every((r) => r.available);
    return { allAvailable, items: results };
  }
}
