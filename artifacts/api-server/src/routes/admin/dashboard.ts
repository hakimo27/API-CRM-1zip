import { Router, type IRouter } from "express";
import { eq, sql, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { ordersTable, customersTable, orderItemsTable } from "@workspace/db";
import { AdminGetDashboardResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/admin/dashboard", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];

  const [newOrdersResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(ordersTable)
    .where(eq(ordersTable.status, "new"));

  const [todayOrdersResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(ordersTable)
    .where(sql`${ordersTable.createdAt}::date = ${today}::date`);

  const [todayAssembliesResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(ordersTable)
    .where(
      sql`${ordersTable.status} = 'assembled' AND ${ordersTable.startDate} = ${today}`,
    );

  const [pendingReviewResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(ordersTable)
    .where(eq(ordersTable.managerReviewRequired, true));

  const [revenueResult] = await db
    .select({
      total: sql<number>`COALESCE(SUM(CAST(${ordersTable.exactPrice} AS NUMERIC)), 0)`,
    })
    .from(ordersTable)
    .where(sql`${ordersTable.status} IN ('completed', 'paid', 'assembled', 'issued', 'delivered')`);

  const [activeResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(ordersTable)
    .where(sql`${ordersTable.status} IN ('issued', 'delivered')`);

  const recentOrders = await db
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
    .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
    .orderBy(sql`${ordersTable.createdAt} DESC`)
    .limit(5);

  const orderIds = recentOrders.map((o) => o.id);
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

  const statusBreakdown = await db
    .select({
      status: ordersTable.status,
      count: sql<number>`COUNT(*)`,
    })
    .from(ordersTable)
    .groupBy(ordersTable.status);

  res.json(
    AdminGetDashboardResponse.parse({
      newOrders: Number(newOrdersResult?.count ?? 0),
      todayOrders: Number(todayOrdersResult?.count ?? 0),
      todayAssemblies: Number(todayAssembliesResult?.count ?? 0),
      pendingReview: Number(pendingReviewResult?.count ?? 0),
      totalRevenue: Number(revenueResult?.total ?? 0),
      activeRentals: Number(activeResult?.count ?? 0),
      recentOrders: recentOrders.map((o) => ({
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
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.status,
        count: Number(s.count),
      })),
    }),
  );
});

export default router;
