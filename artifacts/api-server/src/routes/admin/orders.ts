import { Router, type IRouter } from "express";
import { eq, and, or, ilike, sql, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  ordersTable,
  orderItemsTable,
  orderStatusHistoryTable,
  customersTable,
  productsTable,
} from "@workspace/db";
import {
  AdminListOrdersQueryParams,
  AdminListOrdersResponse,
  AdminGetOrderParams,
  AdminGetOrderResponse,
  AdminUpdateOrderStatusParams,
  AdminUpdateOrderStatusBody,
  AdminUpdateOrderStatusResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/admin/orders", async (req, res): Promise<void> => {
  const query = AdminListOrdersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { status, date_from, date_to, search, page = 1 } = query.data;
  const perPage = 20;
  const offset = (page - 1) * perPage;

  const conditions: any[] = [];
  if (status) conditions.push(eq(ordersTable.status, status as any));
  if (date_from) conditions.push(sql`${ordersTable.startDate} >= ${date_from}`);
  if (date_to) conditions.push(sql`${ordersTable.startDate} <= ${date_to}`);
  if (search) {
    conditions.push(
      or(
        ilike(customersTable.name, `%${search}%`),
        ilike(customersTable.phone, `%${search}%`),
        ilike(ordersTable.orderNumber, `%${search}%`),
      ),
    );
  }

  const baseQuery = db
    .select({
      id: ordersTable.id,
      orderNumber: ordersTable.orderNumber,
      status: ordersTable.status,
      startDate: ordersTable.startDate,
      endDate: ordersTable.endDate,
      customerName: customersTable.name,
      customerPhone: customersTable.phone,
      deliveryType: ordersTable.deliveryType,
      exactPrice: ordersTable.exactPrice,
      approximatePrice: ordersTable.approximatePrice,
      managerReviewRequired: ordersTable.managerReviewRequired,
      createdAt: ordersTable.createdAt,
    })
    .from(ordersTable)
    .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id));

  const orders =
    conditions.length > 0
      ? await baseQuery
          .where(and(...conditions))
          .orderBy(sql`${ordersTable.createdAt} DESC`)
          .limit(perPage)
          .offset(offset)
      : await baseQuery
          .orderBy(sql`${ordersTable.createdAt} DESC`)
          .limit(perPage)
          .offset(offset);

  const orderIds = orders.map((o) => o.id);
  const itemCounts =
    orderIds.length > 0
      ? await db
          .select({
            orderId: orderItemsTable.orderId,
            count: sql<number>`COUNT(*)`,
          })
          .from(orderItemsTable)
          .where(inArray(orderItemsTable.orderId, orderIds))
          .groupBy(orderItemsTable.orderId)
      : [];

  const itemCountMap = new Map(itemCounts.map((ic) => [ic.orderId, Number(ic.count)]));

  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(ordersTable)
    .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const total = Number(countResult?.count ?? 0);

  const result = {
    data: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      startDate: o.startDate,
      endDate: o.endDate,
      customerName: o.customerName ?? "Клиент",
      customerPhone: o.customerPhone ?? "",
      deliveryType: o.deliveryType,
      exactPrice: o.exactPrice ? parseFloat(o.exactPrice) : null,
      approximatePrice: o.approximatePrice ? parseFloat(o.approximatePrice) : null,
      managerReviewRequired: o.managerReviewRequired,
      createdAt: o.createdAt.toISOString(),
      itemCount: itemCountMap.get(o.id) ?? 0,
    })),
    total,
    page,
    perPage,
  };

  res.json(AdminListOrdersResponse.parse(result));
});

router.get("/admin/orders/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, id));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const customer = order.customerId
    ? await db
        .select()
        .from(customersTable)
        .where(eq(customersTable.id, order.customerId))
        .then((r) => r[0])
    : null;

  const items = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, order.id));

  const history = await db
    .select()
    .from(orderStatusHistoryTable)
    .where(eq(orderStatusHistoryTable.orderId, order.id))
    .orderBy(orderStatusHistoryTable.changedAt);

  const allProducts = await db
    .select({ id: productsTable.id, name: productsTable.name })
    .from(productsTable);
  const productMap = new Map(allProducts.map((p) => [p.id, p.name]));

  const result = {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    startDate: order.startDate,
    endDate: order.endDate,
    customerName: customer?.name ?? "Клиент",
    customerPhone: customer?.phone ?? "",
    customerEmail: customer?.email ?? null,
    communicationChannel: customer?.communicationChannel ?? "phone",
    deliveryType: order.deliveryType,
    deliveryAddress: order.deliveryAddress ?? null,
    comment: order.comment ?? null,
    exactPrice: order.exactPrice ? parseFloat(order.exactPrice) : null,
    approximatePrice: order.approximatePrice ? parseFloat(order.approximatePrice) : null,
    managerReviewRequired: order.managerReviewRequired,
    pricingComment: order.pricingComment ?? null,
    totalDeposit: order.totalDeposit ? parseFloat(order.totalDeposit) : null,
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: productMap.get(item.productId) ?? "Товар",
      quantity: item.quantity,
      lifejacketSizes: item.lifejacketSizes ?? null,
      depositAmount: item.depositAmount ? parseFloat(item.depositAmount) : null,
    })),
    statusHistory: history.map((h) => ({
      status: h.status,
      comment: h.comment ?? null,
      changedAt: h.changedAt.toISOString(),
    })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };

  res.json(AdminGetOrderResponse.parse(result));
});

router.patch("/admin/orders/:id/status", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const body = AdminUpdateOrderStatusBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, id));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const [updated] = await db
    .update(ordersTable)
    .set({ status: body.data.status as any })
    .where(eq(ordersTable.id, id))
    .returning();

  await db.insert(orderStatusHistoryTable).values({
    orderId: id,
    status: body.data.status,
    comment: body.data.comment ?? null,
  });

  const customer = updated.customerId
    ? await db
        .select()
        .from(customersTable)
        .where(eq(customersTable.id, updated.customerId))
        .then((r) => r[0])
    : null;

  const items = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, updated.id));

  const history = await db
    .select()
    .from(orderStatusHistoryTable)
    .where(eq(orderStatusHistoryTable.orderId, updated.id))
    .orderBy(orderStatusHistoryTable.changedAt);

  const allProducts = await db
    .select({ id: productsTable.id, name: productsTable.name })
    .from(productsTable);
  const productMap = new Map(allProducts.map((p) => [p.id, p.name]));

  res.json(
    AdminUpdateOrderStatusResponse.parse({
      id: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      startDate: updated.startDate,
      endDate: updated.endDate,
      customerName: customer?.name ?? "Клиент",
      customerPhone: customer?.phone ?? "",
      customerEmail: customer?.email ?? null,
      communicationChannel: customer?.communicationChannel ?? "phone",
      deliveryType: updated.deliveryType,
      deliveryAddress: updated.deliveryAddress ?? null,
      comment: updated.comment ?? null,
      exactPrice: updated.exactPrice ? parseFloat(updated.exactPrice) : null,
      approximatePrice: updated.approximatePrice ? parseFloat(updated.approximatePrice) : null,
      managerReviewRequired: updated.managerReviewRequired,
      pricingComment: updated.pricingComment ?? null,
      totalDeposit: updated.totalDeposit ? parseFloat(updated.totalDeposit) : null,
      items: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: productMap.get(item.productId) ?? "Товар",
        quantity: item.quantity,
        lifejacketSizes: item.lifejacketSizes ?? null,
        depositAmount: item.depositAmount ? parseFloat(item.depositAmount) : null,
      })),
      statusHistory: history.map((h) => ({
        status: h.status,
        comment: h.comment ?? null,
        changedAt: h.changedAt.toISOString(),
      })),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    }),
  );
});

export default router;
