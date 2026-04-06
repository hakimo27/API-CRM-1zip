import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  Logger,
  Optional,
} from "@nestjs/common";
import { eq, desc, and, or, like, inArray, not, lt, gt } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import {
  ordersTable,
  orderItemsTable,
  orderStatusHistoryTable,
  productsTable,
  customersTable,
  inventoryUnitsTable,
  settingsTable,
  branchesTable,
} from "@workspace/db";
import { AvailabilityService } from "../availability/availability.service.js";
import { PricingService } from "../pricing/pricing.service.js";
import { BusinessNotificationsService } from "../notifications/business-notifications.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
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
  customerPhone?: string;
  customerEmail?: string;
  communicationChannel?: string;
  startDate?: string;
  endDate?: string;
  items: CreateOrderItemDto[];
  notes?: string;
  managerComment?: string;
  customerComment?: string;
  depositPaid?: boolean;
  branchId?: number;
  pickupPointId?: number;
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
    private pricingService: PricingService,
    @Optional() private businessNotifications: BusinessNotificationsService,
    @Optional() private notificationsService: NotificationsService,
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

  private async getDeliverySettings(): Promise<{ deliveryEnabled: boolean; pickupEnabled: boolean }> {
    try {
      const rows = await this.db
        .select()
        .from(settingsTable)
        .where(
          or(
            eq(settingsTable.key, "delivery.enabled"),
            eq(settingsTable.key, "delivery.self_pickup_enabled")
          )
        );
      const map: Record<string, unknown> = {};
      for (const row of rows) map[row.key] = row.value;
      const toBool = (v: unknown, fallback: boolean) => {
        if (v === null || v === undefined) return fallback;
        if (typeof v === 'boolean') return v;
        if (v === 'true' || v === 1) return true;
        if (v === 'false' || v === 0) return false;
        return fallback;
      };
      return {
        deliveryEnabled: toBool(map["delivery.enabled"], true),
        pickupEnabled: toBool(map["delivery.self_pickup_enabled"], true),
      };
    } catch {
      return { deliveryEnabled: true, pickupEnabled: true };
    }
  }

  async create(dto: CreateOrderDto) {
    this.logger.log(`Creating order for ${dto.customerPhone}, items: ${dto.items.length}`);

    // Validate delivery type against current settings
    if (dto.deliveryType) {
      const { deliveryEnabled, pickupEnabled } = await this.getDeliverySettings();
      if (dto.deliveryType === "delivery" && !deliveryEnabled) {
        throw new BadRequestException("Доставка в настоящее время недоступна. Выберите самовывоз.");
      }
      if (dto.deliveryType === "pickup" && !pickupEnabled) {
        throw new BadRequestException("Самовывоз в настоящее время недоступен. Выберите доставку.");
      }
    }

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
        const messages = unavailable.map((i: any) => {
          const name = i.productName || `Товар #${i.productId}`;
          if (i.availableUnits === 0) {
            return `Товар "${name}" недоступен на выбранные даты`;
          }
          return `Для товара "${name}" доступно только ${i.availableUnits} ед., запрошено: ${i.requestedQuantity}`;
        });
        throw new BadRequestException(messages.join(". "));
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

    // Resolve pickup branch name when delivery type is pickup
    let pickupBranchId: number | undefined;
    let pickupBranchName: string | undefined;
    const resolvedBranchId = dto.branchId || dto.pickupPointId;
    if (resolvedBranchId && (dto.deliveryType === "pickup" || !dto.deliveryType)) {
      const [branch] = await this.db
        .select({ id: branchesTable.id, name: branchesTable.name, address: branchesTable.address })
        .from(branchesTable)
        .where(eq(branchesTable.id, resolvedBranchId))
        .limit(1);
      if (branch) {
        pickupBranchId = branch.id;
        pickupBranchName = branch.address ? `${branch.name} (${branch.address})` : branch.name;
      }
    }

    const orderValues: any = {
      orderNumber,
      customerId,
      status: "new",
      totalAmount: String(finalTotalAmount),
      notes: dto.notes || dto.managerComment || undefined,
      comment: dto.customerComment || undefined,
      depositPaid: dto.depositPaid ?? false,
      deliveryType: dto.deliveryType || "pickup",
      deliveryAddress: dto.deliveryAddress || undefined,
      pickupBranchId: pickupBranchId ?? undefined,
      pickupBranchName: pickupBranchName ?? undefined,
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
    const created = await this.findByNumber(orderNumber);
    this.businessNotifications?.notifyNewOrder({
      id: created.id,
      orderNumber: created.orderNumber ?? undefined,
      customerName: created.customerName ?? undefined,
      customerPhone: created.customerPhone ?? undefined,
      totalAmount: created.totalAmount ?? undefined,
    }).catch((e) => this.logger.warn("Notification failed:", e));

    // Send email notifications (non-blocking, fire-and-forget)
    if (this.notificationsService) {
      if (dto.customerEmail) {
        this.notificationsService
          .sendOrderConfirmation(dto.customerEmail, dto.customerName, created.orderNumber!)
          .catch((e) => this.logger.warn("Customer email failed:", e));
      }
      this.notificationsService.getManagerEmail().then((managerEmail) => {
        if (managerEmail) {
          this.notificationsService
            .sendNewOrderNotificationToManager(
              managerEmail,
              created.orderNumber!,
              dto.customerName,
              dto.customerPhone || "",
              String(finalTotalAmount),
              "rental"
            )
            .catch((e) => this.logger.warn("Manager email failed:", e));
        }
      }).catch(() => {});
    }

    return created;
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

  async extendOrder(id: number, newEndDate: string) {
    const [order] = await this.db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id))
      .limit(1);

    if (!order) throw new NotFoundException("Заказ не найден");

    if (["cancelled", "completed", "refunded"].includes(order.status as string)) {
      throw new BadRequestException("Нельзя продлить завершённый или отменённый заказ");
    }

    if (!order.startDate || !order.endDate) {
      throw new BadRequestException("У заказа нет дат аренды — продление недоступно");
    }

    const newEnd = new Date(newEndDate);
    const currentEnd = new Date(order.endDate as string);

    if (newEnd <= currentEnd) {
      throw new BadRequestException("Новая дата окончания должна быть позже текущей");
    }

    // Check availability for all items from the extended period
    const items = await this.db
      .select({ item: orderItemsTable, product: productsTable })
      .from(orderItemsTable)
      .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
      .where(eq(orderItemsTable.orderId, id));

    if (items.length > 0) {
      // Check each product for conflicts in the extension window (currentEnd → newEnd)
      for (const { item, product } of items) {
        const extConflicts = await this.db
          .select({ cnt: orderItemsTable.quantity })
          .from(orderItemsTable)
          .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
          .where(
            and(
              eq(orderItemsTable.productId, item.productId!),
              not(inArray(ordersTable.status, ["cancelled", "completed", "refunded"])),
              not(eq(orderItemsTable.orderId, id)),
              lt(orderItemsTable.startDate, newEnd),
              gt(orderItemsTable.endDate, currentEnd)
            )
          );

        if (extConflicts.length > 0) {
          const name = product?.name ?? `Товар #${item.productId}`;
          throw new BadRequestException(
            `Невозможно продлить заказ: товар "${name}" уже забронирован на выбранный период`
          );
        }
      }
    }

    // Update order end date
    await this.db
      .update(ordersTable)
      .set({ endDate: newEnd } as any)
      .where(eq(ordersTable.id, id));

    // Update all order items' end dates
    await this.db
      .update(orderItemsTable)
      .set({ endDate: newEnd } as any)
      .where(eq(orderItemsTable.orderId, id));

    // Recalculate price if possible
    if (order.startDate) {
      try {
        const itemsForPricing = items.map(({ item }) => ({
          productId: item.productId!,
          quantity: item.quantity ?? 1,
          tariffId: item.tariffId ?? undefined,
          pricePerDay: item.pricePerDay ? Number(item.pricePerDay) : undefined,
        }));
        const pricing = await this.pricingService.calculateProductsPrice(
          itemsForPricing,
          new Date(order.startDate as string),
          newEnd
        );
        await this.db
          .update(ordersTable)
          .set({ totalAmount: String(pricing.totalPrice) } as any)
          .where(eq(ordersTable.id, id));
      } catch {
        // Best-effort — if pricing fails, keep old total
      }
    }

    await this.db.insert(orderStatusHistoryTable).values({
      orderId: id,
      status: order.status as any,
      comment: `Заказ продлён до ${newEnd.toLocaleDateString("ru-RU")}`,
    });

    return this.findByNumber(order.orderNumber!);
  }

  async findById(id: number) {
    const [order] = await this.db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
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
      items: items.map(({ item, product }) => ({
        ...item,
        productName: product?.name,
        product,
      })),
      statusHistory,
    };
  }

  async addItem(orderId: number, itemData: {
    productId: number;
    quantity: number;
    pricePerDay?: number;
    totalPrice?: number;
  }) {
    const [order] = await this.db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (!order) throw new NotFoundException("Заказ не найден");

    const [product] = await this.db.select().from(productsTable).where(eq(productsTable.id, itemData.productId)).limit(1);
    if (!product) throw new NotFoundException("Товар не найден");

    await this.db.insert(orderItemsTable).values({
      orderId,
      productId: itemData.productId,
      quantity: itemData.quantity,
      startDate: order.startDate ? new Date(order.startDate as string) : undefined,
      endDate: order.endDate ? new Date(order.endDate as string) : undefined,
      pricePerDay: itemData.pricePerDay !== undefined ? String(itemData.pricePerDay) : undefined,
      totalPrice: itemData.totalPrice !== undefined ? String(itemData.totalPrice) : undefined,
    });

    await this.recalculateOrderTotal(orderId);

    await this.db.insert(orderStatusHistoryTable).values({
      orderId,
      status: order.status as any,
      comment: `Добавлен товар: ${product.name} x${itemData.quantity}`,
    });

    return this.findById(orderId);
  }

  async updateItem(orderId: number, itemId: number, data: {
    quantity?: number;
    pricePerDay?: number;
    totalPrice?: number;
  }) {
    const [item] = await this.db.select().from(orderItemsTable)
      .where(and(eq(orderItemsTable.id, itemId), eq(orderItemsTable.orderId, orderId)))
      .limit(1);
    if (!item) throw new NotFoundException("Позиция заказа не найдена");

    const updateData: any = {};
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.pricePerDay !== undefined) updateData.pricePerDay = String(data.pricePerDay);
    if (data.totalPrice !== undefined) updateData.totalPrice = String(data.totalPrice);

    await this.db.update(orderItemsTable).set(updateData).where(eq(orderItemsTable.id, itemId));

    await this.recalculateOrderTotal(orderId);

    return this.findById(orderId);
  }

  async removeItem(orderId: number, itemId: number) {
    const [item] = await this.db.select().from(orderItemsTable)
      .where(and(eq(orderItemsTable.id, itemId), eq(orderItemsTable.orderId, orderId)))
      .limit(1);
    if (!item) throw new NotFoundException("Позиция заказа не найдена");

    const [order] = await this.db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    const [product] = await this.db.select().from(productsTable).where(eq(productsTable.id, item.productId!)).limit(1);

    await this.db.delete(orderItemsTable).where(eq(orderItemsTable.id, itemId));

    await this.recalculateOrderTotal(orderId);

    if (order) {
      await this.db.insert(orderStatusHistoryTable).values({
        orderId,
        status: order.status as any,
        comment: `Удалён товар: ${product?.name || `#${item.productId}`}`,
      });
    }

    return this.findById(orderId);
  }

  private async recalculateOrderTotal(orderId: number) {
    const items = await this.db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
    const total = items.reduce((sum, item) => sum + parseFloat((item.totalPrice as string) || "0"), 0);
    if (total > 0) {
      await this.db.update(ordersTable).set({ totalAmount: String(total) } as any).where(eq(ordersTable.id, orderId));
    }
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
