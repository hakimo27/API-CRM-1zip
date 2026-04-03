import { Router, type IRouter } from "express";
import { eq, ilike, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { customersTable, ordersTable, orderItemsTable } from "@workspace/db";
import {
  AdminListCustomersQueryParams,
  AdminListCustomersResponse,
  AdminGetCustomerParams,
  AdminGetCustomerResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/admin/customers", async (req, res): Promise<void> => {
  const query = AdminListCustomersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { search, page = 1 } = query.data;
  const perPage = 20;
  const offset = (page - 1) * perPage;

  const condition = search
    ? ilike(customersTable.name, `%${search}%`)
    : undefined;

  const customers = await db
    .select({
      id: customersTable.id,
      name: customersTable.name,
      phone: customersTable.phone,
      email: customersTable.email,
      communicationChannel: customersTable.communicationChannel,
      orderCount: sql<number>`COUNT(DISTINCT ${ordersTable.id})`,
      createdAt: customersTable.createdAt,
    })
    .from(customersTable)
    .leftJoin(ordersTable, eq(ordersTable.customerId, customersTable.id))
    .where(condition)
    .groupBy(customersTable.id)
    .orderBy(sql`${customersTable.createdAt} DESC`)
    .limit(perPage)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(customersTable)
    .where(condition);

  const total = Number(countResult?.count ?? 0);

  res.json(
    AdminListCustomersResponse.parse({
      data: customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email ?? null,
        communicationChannel: c.communicationChannel ?? null,
        orderCount: Number(c.orderCount),
        createdAt: c.createdAt.toISOString(),
      })),
      total,
      page,
      perPage,
    }),
  );
});

router.get("/admin/customers/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, id));

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  const orders = await db
    .select({
      id: ordersTable.id,
      orderNumber: ordersTable.orderNumber,
      status: ordersTable.status,
      startDate: ordersTable.startDate,
      endDate: ordersTable.endDate,
      deliveryType: ordersTable.deliveryType,
      exactPrice: ordersTable.exactPrice,
      approximatePrice: ordersTable.approximatePrice,
      managerReviewRequired: ordersTable.managerReviewRequired,
      createdAt: ordersTable.createdAt,
      itemCount: sql<number>`COUNT(DISTINCT ${orderItemsTable.id})`,
    })
    .from(ordersTable)
    .leftJoin(orderItemsTable, eq(orderItemsTable.orderId, ordersTable.id))
    .where(eq(ordersTable.customerId, id))
    .groupBy(ordersTable.id)
    .orderBy(sql`${ordersTable.createdAt} DESC`);

  res.json(
    AdminGetCustomerResponse.parse({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? null,
      communicationChannel: customer.communicationChannel ?? null,
      notes: customer.notes ?? null,
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        startDate: o.startDate,
        endDate: o.endDate,
        customerName: customer.name,
        customerPhone: customer.phone,
        deliveryType: o.deliveryType,
        exactPrice: o.exactPrice ? parseFloat(o.exactPrice) : null,
        approximatePrice: o.approximatePrice ? parseFloat(o.approximatePrice) : null,
        managerReviewRequired: o.managerReviewRequired,
        createdAt: o.createdAt.toISOString(),
        itemCount: Number(o.itemCount),
      })),
      createdAt: customer.createdAt.toISOString(),
    }),
  );
});

export default router;
