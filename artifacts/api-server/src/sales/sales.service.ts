import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { eq, desc, inArray } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import {
  saleOrdersTable,
  saleOrderItemsTable,
  saleProductsTable,
} from "@workspace/db";
import { generateOrderNumber } from "@workspace/shared";

type DrizzleDb = typeof import("@workspace/db").db;

@Injectable()
export class SalesService {
  constructor(@Inject(DB_TOKEN) private db: DrizzleDb) {}

  async findAllProducts(params: { active?: boolean; search?: string }) {
    const { active, search } = params;
    let products = await this.db
      .select()
      .from(saleProductsTable)
      .where(active !== undefined ? eq(saleProductsTable.active, active) : undefined)
      .orderBy(desc(saleProductsTable.createdAt));

    if (search) {
      const s = search.toLowerCase();
      products = products.filter(
        (p) => p.name.toLowerCase().includes(s) || (p.sku || "").toLowerCase().includes(s)
      );
    }

    return products;
  }

  async findProductById(id: number) {
    const [product] = await this.db
      .select()
      .from(saleProductsTable)
      .where(eq(saleProductsTable.id, id))
      .limit(1);
    if (!product) throw new NotFoundException("Товар для продажи не найден");
    return product;
  }

  async createProduct(data: typeof saleProductsTable.$inferInsert) {
    const [created] = await this.db.insert(saleProductsTable).values(data).returning();
    return created;
  }

  async updateProduct(id: number, data: Partial<typeof saleProductsTable.$inferInsert>) {
    const [updated] = await this.db
      .update(saleProductsTable)
      .set(data)
      .where(eq(saleProductsTable.id, id))
      .returning();
    if (!updated) throw new NotFoundException("Товар для продажи не найден");
    return updated;
  }

  async deleteProduct(id: number) {
    const [deleted] = await this.db.delete(saleProductsTable).where(eq(saleProductsTable.id, id)).returning({ id: saleProductsTable.id });
    if (!deleted) throw new NotFoundException("Товар для продажи не найден");
    return { message: "Товар удалён" };
  }

  async findAllOrders(params: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 50 } = params;
    const offset = (page - 1) * limit;

    let orders = await this.db
      .select()
      .from(saleOrdersTable)
      .orderBy(desc(saleOrdersTable.createdAt))
      .limit(limit)
      .offset(offset);

    if (status) orders = orders.filter((o) => o.status === status);

    const orderIds = orders.map((o) => o.id);
    if (orderIds.length === 0) return [];

    const items = await this.db
      .select({ item: saleOrderItemsTable, product: saleProductsTable })
      .from(saleOrderItemsTable)
      .leftJoin(saleProductsTable, eq(saleOrderItemsTable.productId, saleProductsTable.id))
      .where(inArray(saleOrderItemsTable.orderId, orderIds));

    return orders.map((order) => ({
      ...order,
      items: items
        .filter((i) => i.item.orderId === order.id)
        .map(({ item, product }) => ({ ...item, product })),
    }));
  }

  async createOrder(data: {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    items: Array<{ productId: number; quantity: number }>;
    notes?: string;
    deliveryAddress?: {
      name: string;
      phone: string;
      address: string;
      city: string;
      postalCode?: string;
    };
  }) {
    const orderItems = await Promise.all(
      data.items.map(async ({ productId, quantity }) => {
        const [product] = await this.db
          .select()
          .from(saleProductsTable)
          .where(eq(saleProductsTable.id, productId))
          .limit(1);

        if (!product) throw new NotFoundException(`Товар ID ${productId} не найден`);

        const unitPrice = parseFloat(product.price as string);
        return {
          productId,
          quantity,
          unitPrice,
          totalPrice: unitPrice * quantity,
          name: product.name,
        };
      })
    );

    const totalAmount = orderItems.reduce((sum, i) => sum + i.totalPrice, 0);
    const orderNumber = generateOrderNumber();

    const [order] = await this.db
      .insert(saleOrdersTable)
      .values({
        orderNumber,
        status: "new",
        totalAmount: String(totalAmount),
        notes: data.notes,
        deliveryAddress: data.deliveryAddress || {
          name: data.customerName,
          phone: data.customerPhone,
          address: "",
          city: "",
        },
      })
      .returning();

    if (!order) throw new NotFoundException("Ошибка создания заказа");

    for (const item of orderItems) {
      await this.db.insert(saleOrderItemsTable).values({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        price: String(item.unitPrice),
        name: item.name,
      });
    }

    return order;
  }

  async updateOrderStatus(id: number, status: string) {
    const [updated] = await this.db
      .update(saleOrdersTable)
      .set({ status: status as any })
      .where(eq(saleOrdersTable.id, id))
      .returning();
    if (!updated) throw new NotFoundException("Заказ не найден");
    return updated;
  }

  async getStats() {
    const orders = await this.db.select().from(saleOrdersTable);
    return {
      total: orders.length,
      new: orders.filter((o) => o.status === "new").length,
      completed: orders.filter((o) => o.status === "delivered").length,
      totalRevenue: orders
        .filter((o) => !["cancelled", "refunded"].includes(o.status as string))
        .reduce((sum, o) => sum + parseFloat((o.totalAmount as string) || "0"), 0),
    };
  }
}
