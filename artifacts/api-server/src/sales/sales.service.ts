import { Injectable, NotFoundException, Inject, Optional } from "@nestjs/common";
import { BusinessNotificationsService } from "../notifications/business-notifications.service.js";
import { eq, desc, inArray, and } from "drizzle-orm";
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
  constructor(
    @Inject(DB_TOKEN) private db: DrizzleDb,
    @Optional() private businessNotifications: BusinessNotificationsService,
  ) {}

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

  async findProductBySlug(slug: string) {
    const [product] = await this.db
      .select()
      .from(saleProductsTable)
      .where(eq(saleProductsTable.slug, slug))
      .limit(1);
    if (!product) throw new NotFoundException("Товар не найден");
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

    return orders.map((order) => {
      const addr = (order.deliveryAddress as any) || {};
      return {
        ...order,
        customerName: order.customerName || addr.name || null,
        customerPhone: order.customerPhone || addr.phone || null,
        items: items
          .filter((i) => i.item.orderId === order.id)
          .map(({ item, product }) => ({ ...item, product })),
      };
    });
  }

  async findOrderById(id: number) {
    const [order] = await this.db
      .select()
      .from(saleOrdersTable)
      .where(eq(saleOrdersTable.id, id))
      .limit(1);
    if (!order) throw new NotFoundException("Заказ не найден");

    const items = await this.db
      .select({ item: saleOrderItemsTable, product: saleProductsTable })
      .from(saleOrderItemsTable)
      .leftJoin(saleProductsTable, eq(saleOrderItemsTable.productId, saleProductsTable.id))
      .where(eq(saleOrderItemsTable.orderId, id));

    const addr = (order.deliveryAddress as any) || {};
    return {
      ...order,
      customerName: order.customerName || addr.name || null,
      customerPhone: order.customerPhone || addr.phone || null,
      items: items.map(({ item, product }) => ({ ...item, product })),
    };
  }

  async updateOrder(id: number, data: any) {
    const [updated] = await this.db
      .update(saleOrdersTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(saleOrdersTable.id, id))
      .returning();
    if (!updated) throw new NotFoundException("Заказ не найден");
    return this.findOrderById(id);
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

    const result = await this.findOrderById(order.id);
    this.businessNotifications?.notifyNewSaleOrder({
      id: result.id,
      orderNumber: result.orderNumber ?? undefined,
      totalAmount: result.totalAmount ?? undefined,
      deliveryAddress: result.deliveryAddress as any,
    }).catch(() => {});
    return result;
  }

  async addOrderItem(orderId: number, data: { productId: number; quantity: number; price?: number }) {
    const [order] = await this.db.select().from(saleOrdersTable).where(eq(saleOrdersTable.id, orderId)).limit(1);
    if (!order) throw new NotFoundException("Заказ не найден");

    const [product] = await this.db.select().from(saleProductsTable).where(eq(saleProductsTable.id, data.productId)).limit(1);
    if (!product) throw new NotFoundException("Товар не найден");

    const unitPrice = data.price !== undefined ? data.price : parseFloat(product.price as string);

    await this.db.insert(saleOrderItemsTable).values({
      orderId,
      productId: data.productId,
      quantity: data.quantity,
      price: String(unitPrice),
      name: product.name,
    });

    await this.recalculateOrderTotal(orderId);

    return this.findOrderById(orderId);
  }

  async updateOrderItem(orderId: number, itemId: number, data: { quantity?: number; price?: number }) {
    const [item] = await this.db
      .select()
      .from(saleOrderItemsTable)
      .where(and(eq(saleOrderItemsTable.id, itemId), eq(saleOrderItemsTable.orderId, orderId)))
      .limit(1);
    if (!item) throw new NotFoundException("Позиция заказа не найдена");

    const updateData: any = {};
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.price !== undefined) updateData.price = String(data.price);

    await this.db.update(saleOrderItemsTable).set(updateData).where(eq(saleOrderItemsTable.id, itemId));

    await this.recalculateOrderTotal(orderId);

    return this.findOrderById(orderId);
  }

  async removeOrderItem(orderId: number, itemId: number) {
    const [item] = await this.db
      .select()
      .from(saleOrderItemsTable)
      .where(and(eq(saleOrderItemsTable.id, itemId), eq(saleOrderItemsTable.orderId, orderId)))
      .limit(1);
    if (!item) throw new NotFoundException("Позиция заказа не найдена");

    await this.db.delete(saleOrderItemsTable).where(eq(saleOrderItemsTable.id, itemId));

    await this.recalculateOrderTotal(orderId);

    return this.findOrderById(orderId);
  }

  private async recalculateOrderTotal(orderId: number) {
    const items = await this.db.select().from(saleOrderItemsTable).where(eq(saleOrderItemsTable.orderId, orderId));
    const total = items.reduce((sum, item) => {
      const price = parseFloat((item.price as string) || "0");
      return sum + price * (item.quantity || 1);
    }, 0);
    await this.db.update(saleOrdersTable).set({ totalAmount: String(total) }).where(eq(saleOrdersTable.id, orderId));
  }

  async updateOrderStatus(id: number, status: string) {
    const [updated] = await this.db
      .update(saleOrdersTable)
      .set({ status: status as any })
      .where(eq(saleOrdersTable.id, id))
      .returning();
    if (!updated) throw new NotFoundException("Заказ не найден");
    return this.findOrderById(id);
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
