import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { eq, and, desc, inArray } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import { inventoryUnitsTable, inventoryStatusHistoriesTable, productsTable } from "@workspace/db";

type DrizzleDb = typeof import("@workspace/db").db;

@Injectable()
export class InventoryService {
  constructor(@Inject(DB_TOKEN) private db: DrizzleDb) {}

  async findAll(params: { productId?: number; status?: string; branchId?: number }) {
    const { productId, status, branchId } = params;

    const units = await this.db
      .select({ unit: inventoryUnitsTable, product: productsTable })
      .from(inventoryUnitsTable)
      .leftJoin(productsTable, eq(inventoryUnitsTable.productId, productsTable.id))
      .orderBy(desc(inventoryUnitsTable.createdAt));

    return units
      .filter(({ unit }) => {
        if (productId && unit.productId !== productId) return false;
        if (status && unit.status !== status) return false;
        return true;
      })
      .map(({ unit, product }) => ({ ...unit, product }));
  }

  async findById(id: number) {
    const [unit] = await this.db
      .select({ unit: inventoryUnitsTable, product: productsTable })
      .from(inventoryUnitsTable)
      .leftJoin(productsTable, eq(inventoryUnitsTable.productId, productsTable.id))
      .where(eq(inventoryUnitsTable.id, id))
      .limit(1);

    if (!unit) throw new NotFoundException("Единица инвентаря не найдена");
    return { ...unit.unit, product: unit.product };
  }

  async create(data: typeof inventoryUnitsTable.$inferInsert) {
    const [created] = await this.db.insert(inventoryUnitsTable).values(data).returning();
    return created;
  }

  async update(id: number, data: Partial<typeof inventoryUnitsTable.$inferInsert>) {
    const [updated] = await this.db
      .update(inventoryUnitsTable)
      .set(data)
      .where(eq(inventoryUnitsTable.id, id))
      .returning();
    if (!updated) throw new NotFoundException("Единица инвентаря не найдена");
    return updated;
  }

  async changeStatus(
    id: number,
    newStatus: string,
    reason: string,
    changedById?: number,
    notes?: string
  ) {
    const [unit] = await this.db
      .select()
      .from(inventoryUnitsTable)
      .where(eq(inventoryUnitsTable.id, id))
      .limit(1);

    if (!unit) throw new NotFoundException("Единица инвентаря не найдена");

    const oldStatus = unit.status;

    await this.db
      .update(inventoryUnitsTable)
      .set({ status: newStatus as any })
      .where(eq(inventoryUnitsTable.id, id));

    await this.db.insert(inventoryStatusHistoriesTable).values({
      inventoryUnitId: id,
      oldStatus,
      newStatus,
      reason,
      changedById,
      notes,
    });

    return this.findById(id);
  }

  async delete(id: number) {
    const [deleted] = await this.db
      .delete(inventoryUnitsTable)
      .where(eq(inventoryUnitsTable.id, id))
      .returning({ id: inventoryUnitsTable.id });
    if (!deleted) throw new NotFoundException("Единица инвентаря не найдена");
    return { message: "Единица инвентаря удалена" };
  }

  async getStats() {
    const all = await this.db.select().from(inventoryUnitsTable);
    return {
      total: all.length,
      available: all.filter((u) => u.status === "available").length,
      rented: all.filter((u) => u.status === "rented").length,
      maintenance: all.filter((u) => u.status === "maintenance").length,
      repair: all.filter((u) => u.status === "repair").length,
      retired: all.filter((u) => u.status === "retired").length,
    };
  }
}
