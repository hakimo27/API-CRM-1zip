import { Router, type IRouter } from "express";
import { sql, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { ordersTable, inventoryUnitsTable } from "@workspace/db";
import {
  AdminGetReportsOverviewQueryParams,
  AdminGetReportsOverviewResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/admin/reports/overview", async (req, res): Promise<void> => {
  const query = AdminGetReportsOverviewQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { date_from, date_to } = query.data;

  const dateConditions: any[] = [];
  if (date_from) dateConditions.push(sql`${ordersTable.createdAt}::date >= ${date_from}::date`);
  if (date_to) dateConditions.push(sql`${ordersTable.createdAt}::date <= ${date_to}::date`);
  const dateWhere = dateConditions.length > 0 ? sql`${dateConditions[0]}${dateConditions[1] ? sql` AND ${dateConditions[1]}` : sql``}` : undefined;

  const [totals] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      completed: sql<number>`COUNT(*) FILTER (WHERE ${ordersTable.status} = 'completed')`,
      cancelled: sql<number>`COUNT(*) FILTER (WHERE ${ordersTable.status} = 'cancelled')`,
      revenue: sql<number>`COALESCE(SUM(CASE WHEN ${ordersTable.status} IN ('completed','paid','assembled','issued','delivered') THEN CAST(${ordersTable.exactPrice} AS NUMERIC) ELSE 0 END), 0)`,
    })
    .from(ordersTable)
    .where(dateWhere);

  const [inRepairResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(inventoryUnitsTable)
    .where(eq(inventoryUnitsTable.status, "in_repair"));

  const [totalUnitsResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(inventoryUnitsTable);

  const [availableUnitsResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(inventoryUnitsTable)
    .where(eq(inventoryUnitsTable.status, "available"));

  const totalUnits = Number(totalUnitsResult?.count ?? 1);
  const availableUnits = Number(availableUnitsResult?.count ?? 0);
  const utilizationRate =
    totalUnits > 0 ? ((totalUnits - availableUnits) / totalUnits) * 100 : 0;

  const statusBreakdown = await db
    .select({
      status: ordersTable.status,
      count: sql<number>`COUNT(*)`,
    })
    .from(ordersTable)
    .where(dateWhere)
    .groupBy(ordersTable.status);

  const revenueByMonth = await db
    .select({
      month: sql<string>`TO_CHAR(${ordersTable.createdAt}, 'YYYY-MM')`,
      revenue: sql<number>`COALESCE(SUM(CAST(${ordersTable.exactPrice} AS NUMERIC)), 0)`,
      orderCount: sql<number>`COUNT(*)`,
    })
    .from(ordersTable)
    .where(dateWhere)
    .groupBy(sql`TO_CHAR(${ordersTable.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${ordersTable.createdAt}, 'YYYY-MM')`);

  res.json(
    AdminGetReportsOverviewResponse.parse({
      totalOrders: Number(totals?.total ?? 0),
      completedOrders: Number(totals?.completed ?? 0),
      cancelledOrders: Number(totals?.cancelled ?? 0),
      totalRevenue: Number(totals?.revenue ?? 0),
      inRepairCount: Number(inRepairResult?.count ?? 0),
      utilizationRate: Math.round(utilizationRate * 10) / 10,
      ordersByStatus: statusBreakdown.map((s) => ({
        status: s.status,
        count: Number(s.count),
      })),
      revenueByMonth: revenueByMonth.map((r) => ({
        month: r.month,
        revenue: Number(r.revenue),
        orderCount: Number(r.orderCount),
      })),
    }),
  );
});

export default router;
