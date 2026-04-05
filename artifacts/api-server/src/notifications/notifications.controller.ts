import { Controller, Get, Query, UseGuards, Inject } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard.js";
import { DB_TOKEN } from "../database/database.module.js";
import { notificationLogsTable, ordersTable, saleOrdersTable, tourBookingsTable, chatSessionsTable } from "@workspace/db";
import { desc, eq, and, gt } from "drizzle-orm";

type DrizzleDb = typeof import("@workspace/db").db;

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(@Inject(DB_TOKEN) private db: DrizzleDb) {}

  @Get("logs")
  async getLogs(
    @Query("channel") channel?: string,
    @Query("status") status?: string,
    @Query("limit") limit = "100",
  ) {
    const rows = await this.db
      .select()
      .from(notificationLogsTable)
      .orderBy(desc(notificationLogsTable.createdAt))
      .limit(Math.min(Number(limit) || 100, 500));

    return rows.filter((r) => {
      if (channel && r.channel !== channel) return false;
      if (status && r.status !== status) return false;
      return true;
    });
  }

  @Get("counts")
  async getCounts() {
    const [rentalOrders, saleOrders, tourBookings, chatSessions] = await Promise.all([
      this.db.select({ id: ordersTable.id }).from(ordersTable).where(eq(ordersTable.status, "new")),
      this.db.select({ id: saleOrdersTable.id }).from(saleOrdersTable).where(eq(saleOrdersTable.status, "new")),
      this.db.select({ id: tourBookingsTable.id }).from(tourBookingsTable).where(eq(tourBookingsTable.status, "pending")),
      this.db.select({ id: chatSessionsTable.id }).from(chatSessionsTable).where(
        and(eq(chatSessionsTable.status, "open"), gt(chatSessionsTable.unreadCount, 0))
      ),
    ]);

    return {
      newOrders: rentalOrders.length,
      newSaleOrders: saleOrders.length,
      pendingBookings: tourBookings.length,
      unreadChats: chatSessions.length,
    };
  }
}
