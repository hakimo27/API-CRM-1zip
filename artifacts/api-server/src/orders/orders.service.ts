import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { eq, desc, and, or, like, inArray } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import {
  ordersTable,
  orderItemsTable,
  orderStatusHistoryTable,
  productsTable,
  customersTable,
  inventoryUnitsTable,
} from "@workspace/db";
import { AvailabilityService } from "../availability/availability.service.js";
import { PricingService } from "../pricing/pricing.service.js";
import { generateOrderNumber } from "@workspace/shared";

type DrizzleDb = typeof import("@workspace/db").db;

export interface CreateOrderDto {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  communicationChannel?: string;
  startDate: string;
  endDate: string;
  items: Array<{ productId: number; quantity: number }>;
  notes?: string;
  depositPaid?: boolean;
  branchId?: number;
  promoCode?: string;
}

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DB_TOKEN) private db: DrizzleDb,
    private availabilityService: AvailabilityService,
    private pricingService: PricingService
  ) {}

  async findAll(params: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    userId?: number;
  }) {
    const { status, search, page = 1, limit = 50, userId } = params;
    const offset = (page - 1) * limit;

    let orders = await this.db
      .select({
        order: ordersTable,
        customer: customersTable,
      })
      .from(ordersTable)
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
      .orderBy(desc(ordersTable.createdAt))
      .limit(limit)
      .offset(offset);

    if (status) {
      orders = orders.filter((o) => o.order.status === status);
    }

    if (search) {
      const s = search.toLowerCase();
      orders = orders.filter(
        (o) =>
          o.order.orderNumber?.toLowerCase().includes(s) ||
          o.customer?.name?.toLowerCase().includes(s) ||
          o.customer?.phone?.includes(s)
      );
    }

    const orderIds = orders.map((o) => o.order.id);
    if (orderIds.length === 0) return [];

    const items = await this.db
      .select({
        item: orderItemsTable,
        product: productsTable,
      })
      .from(orderItemsTable)
      .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
      .where(inArray(orderItemsTable.orderId, orderIds));

    return orders.map(({ order, customer }) => ({
      ...order,
      customer,
      items: items
        .filter((i) => i.item.orderId === order.id)
        .map(({ item, product }) => ({ ...item, product })),
    }));
  }

  async findByNumber(orderNumber: string) {
    const [order] = await this.db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.orderNumber, orderNumber))
      .limit(1);

    if (!order) throw new NotFoundException("Заказ не найден");

    const [customer, items, statusHistory] = await Promise.all([
      order.customerId
        ? this.db.select().from(customersTable).where(eq(customersTable.id, order.customerId)).limit(1)
        : Promise.resolve([]),
      this.db
        .select({ item: orderItemsTable, product: productsTable })
        .from(orderItemsTable)
        .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
        .where(eq(orderItemsTable.orderId, order.id)),
      this.db
        .select()
        .from(orderStatusHistoryTable)
        .where(eq(orderStatusHistoryTable.orderId, order.id))
        .orderBy(desc(orderStatusHistoryTable.changedAt)),
    ]);

    return {
      ...order,
      customer: (customer as any[])[0] || null,
      items: items.map(({ item, product }) => ({ ...item, product })),
      statusHistory,
    };
  }

  async create(dto: CreateOrderDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException("Дата окончания должна быть позже даты начала");
    }

    const availability = await this.availabilityService.checkMultipleProducts(
      dto.items,
      startDate,
      endDate
    );

    if (!availability.allAvailable) {
      const unavailable = availability.items.filter((i) => !i.available);
      throw new BadRequestException(
        `Недостаточно единиц для аренды: ${unavailable.map((i) => `ID ${i.productId}`).join(", ")}`
      );
    }

    const pricing = await this.pricingService.calculateProductsPrice(dto.items, startDate, endDate);

    let customerId: number;
    const existingCustomers = await this.db
      .select()
      .from(customersTable)
      .where(eq(customersTable.phone, dto.customerPhone))
      .limit(1);

    if (existingCustomers.length > 0) {
      customerId = existingCustomers[0].id;
      await this.db
        .update(customersTable)
        .set({
          name: dto.customerName,
          email: dto.customerEmail || existingCustomers[0].email,
        })
        .where(eq(customersTable.id, customerId));
    } else {
      const [newCustomer] = await this.db
        .insert(customersTable)
        .values({
          name: dto.customerName,
          phone: dto.customerPhone,
          email: dto.customerEmail,
          communicationChannel: dto.communicationChannel as any,
        })
        .returning();
      customerId = newCustomer!.id;
    }

    const orderNumber = generateOrderNumber();

    const [order] = await this.db
      .insert(ordersTable)
      .values({
        orderNumber,
        customerId,
        status: "new",
        totalAmount: String(pricing.totalPrice),
        startDate,
        endDate,
        notes: dto.notes,
        depositPaid: dto.depositPaid ?? false,
      })
      .returning();

    if (!order) throw new BadRequestException("Ошибка создания заказа");

    for (const { productId, quantity } of dto.items) {
      const availableUnits = await this.availabilityService.getAvailableUnits(productId, startDate, endDate);
      const pricingItem = pricing.items.find((p) => p.productId === productId);
      const unitsToAssign = availableUnits.slice(0, quantity);

      for (const unit of unitsToAssign) {
        await this.db.insert(orderItemsTable).values({
          orderId: order.id,
          productId,
          inventoryUnitId: unit.id,
          quantity: 1,
          startDate,
          endDate,
          pricePerDay: String(pricingItem?.basePrice || 0),
          totalPrice: String(pricingItem?.basePrice || 0),
        });
      }
    }

    await this.db.insert(orderStatusHistoryTable).values({
      orderId: order.id,
      status: "new",
      comment: "Заказ создан",
    });

    return this.findByNumber(orderNumber);
  }

  async updateStatus(id: number, status: string, comment?: string, changedById?: number) {
    const [order] = await this.db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    if (!order) throw new NotFoundException("Заказ не найден");

    await this.db.update(ordersTable).set({ status: status as any }).where(eq(ordersTable.id, id));

    await this.db.insert(orderStatusHistoryTable).values({
      orderId: id,
      status: status as any,
      comment,
    });

    return this.findByNumber(order.orderNumber!);
  }

  async update(id: number, data: Record<string, unknown>) {
    const [updated] = await this.db
      .update(ordersTable)
      .set(data as any)
      .where(eq(ordersTable.id, id))
      .returning();

    if (!updated) throw new NotFoundException("Заказ не найден");
    return updated;
  }

  async getStats() {
    const all = await this.db.select().from(ordersTable);
    const stats = {
      total: all.length,
      new: all.filter((o) => o.status === "new").length,
      confirmed: all.filter((o) => o.status === "confirmed").length,
      in_progress: all.filter((o) => o.status === "in_progress").length,
      completed: all.filter((o) => o.status === "completed").length,
      cancelled: all.filter((o) => o.status === "cancelled").length,
      totalRevenue: all
        .filter((o) => !["cancelled", "refunded"].includes(o.status as string))
        .reduce((sum, o) => sum + parseFloat((o.totalAmount as string) || "0"), 0),
    };
    return stats;
  }
}
