import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  Logger,
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

export interface CreateOrderItemDto {
  productId: number;
  quantity: number;
  startDate?: string;
  endDate?: string;
  tariffId?: number;
  pricePerDay?: number;
  totalPrice?: number;
}

export interface CreateOrderDto {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  communicationChannel?: string;
  startDate?: string;
  endDate?: string;
  items: CreateOrderItemDto[];
  notes?: string;
  depositPaid?: boolean;
  branchId?: number;
  deliveryType?: string;
  deliveryAddress?: string;
  promoCode?: string;
  totalAmount?: number;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

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

  private parseDate(dateStr: string | undefined, fieldName: string): Date | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      this.logger.warn(`Invalid date for ${fieldName}: "${dateStr}"`);
      return null;
    }
    return d;
  }

  async create(dto: CreateOrderDto) {
    this.logger.log(`Creating order for ${dto.customerPhone}, items: ${dto.items.length}`);

    // Derive order-level dates: use dto.startDate/endDate if provided,
    // otherwise derive from item-level dates (min start, max end)
    let startDate: Date | null = this.parseDate(dto.startDate, "startDate");
    let endDate: Date | null = this.parseDate(dto.endDate, "endDate");

    if (!startDate || !endDate) {
      const itemDates = dto.items
        .map(item => ({
          start: this.parseDate(item.startDate, "item.startDate"),
          end: this.parseDate(item.endDate, "item.endDate"),
        }))
        .filter(d => d.start && d.end);

      if (itemDates.length > 0) {
        startDate = itemDates.reduce((min, d) => d.start! < min ? d.start! : min, itemDates[0].start!);
        endDate = itemDates.reduce((max, d) => d.end! > max ? d.end! : max, itemDates[0].end!);
      }
    }

    // If still no dates, create an open-ended order (e.g., fixed sale without rental period)
    const hasRentalDates = startDate && endDate;

    if (hasRentalDates && endDate! <= startDate!) {
      throw new BadRequestException("Дата окончания должна быть позже даты начала");
    }

    // Only check availability if we have rental dates
    if (hasRentalDates) {
      const availability = await this.availabilityService.checkMultipleProducts(
        dto.items,
        startDate!,
        endDate!
      );

      if (!availability.allAvailable) {
        const unavailable = availability.items.filter((i: any) => !i.available);
        throw new BadRequestException(
          `Недостаточно единиц для аренды: ${unavailable.map((i: any) => `ID ${i.productId}`).join(", ")}`
        );
      }
    }

    // Use pre-calculated total from checkout, or calculate if not provided
    let finalTotalAmount: number;
    if (dto.totalAmount && dto.totalAmount > 0) {
      finalTotalAmount = dto.totalAmount;
    } else if (hasRentalDates) {
      const pricing = await this.pricingService.calculateProductsPrice(dto.items, startDate!, endDate!);
      finalTotalAmount = pricing.totalPrice;
    } else {
      // Sum from item-level totalPrice if available
      finalTotalAmount = dto.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    }

    // Customer upsert
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

    const orderValues: any = {
      orderNumber,
      customerId,
      status: "new",
      totalAmount: String(finalTotalAmount),
      notes: dto.notes,
      depositPaid: dto.depositPaid ?? false,
    };

    if (startDate) orderValues.startDate = startDate;
    if (endDate) orderValues.endDate = endDate;

    const [order] = await this.db
      .insert(ordersTable)
      .values(orderValues)
      .returning();

    if (!order) throw new BadRequestException("Ошибка создания заказа");

    for (const orderItem of dto.items) {
      const { productId, quantity } = orderItem;

      // Use item-level dates if available, otherwise use order-level dates
      const itemStartDate = this.parseDate(orderItem.startDate, "item.startDate") || startDate;
      const itemEndDate = this.parseDate(orderItem.endDate, "item.endDate") || endDate;

      const itemValues: any = {
        orderId: order.id,
        productId,
        quantity: quantity || 1,
        pricePerDay: String(orderItem.pricePerDay || 0),
        totalPrice: String(orderItem.totalPrice || 0),
      };

      if (itemStartDate) itemValues.startDate = itemStartDate;
      if (itemEndDate) itemValues.endDate = itemEndDate;

      // Try to assign available units for inventory tracking
      if (itemStartDate && itemEndDate) {
        try {
          const availableUnits = await this.availabilityService.getAvailableUnits(productId, itemStartDate, itemEndDate);
          const unitsToAssign = availableUnits.slice(0, quantity);

          if (unitsToAssign.length > 0) {
            for (const unit of unitsToAssign) {
              await this.db.insert(orderItemsTable).values({
                ...itemValues,
                inventoryUnitId: unit.id,
                quantity: 1,
              });
            }
            continue;
          }
        } catch (e) {
          this.logger.warn(`Could not assign inventory units for product ${productId}: ${e}`);
        }
      }

      // Fallback: insert without unit assignment
      await this.db.insert(orderItemsTable).values(itemValues);
    }

    await this.db.insert(orderStatusHistoryTable).values({
      orderId: order.id,
      status: "new",
      comment: "Заказ создан",
    });

    this.logger.log(`Order ${orderNumber} created successfully`);
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
