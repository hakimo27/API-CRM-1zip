import { Controller, Get, Post, Body, Query, UseGuards, Inject, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard.js";
import { Public } from "../common/decorators/public.decorator.js";
import { Roles } from "../common/decorators/roles.decorator.js";
import { DB_TOKEN } from "../database/database.module.js";
import { NotificationsService } from "./notifications.service.js";
import { PushNotificationsService } from "./push-notifications.service.js";
import { notificationLogsTable, ordersTable, saleOrdersTable, tourBookingsTable, chatSessionsTable } from "@workspace/db";
import { desc, eq, and, gt } from "drizzle-orm";

type DrizzleDb = typeof import("@workspace/db").db;

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    @Inject(DB_TOKEN) private db: DrizzleDb,
    private notificationsService: NotificationsService,
    private pushService: PushNotificationsService,
  ) {}

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

  @Get("recent")
  async getRecent(@Query("limit") limit = "30") {
    const rows = await this.db
      .select()
      .from(notificationLogsTable)
      .where(eq(notificationLogsTable.channel, "system"))
      .orderBy(desc(notificationLogsTable.createdAt))
      .limit(Math.min(Number(limit) || 30, 100));
    return rows;
  }

  @Post("test-email")
  @Roles("superadmin", "admin")
  async testEmail(@Body() body: { email: string }) {
    if (!body.email) {
      return { success: false, message: "Укажите email для тестовой отправки" };
    }
    return this.notificationsService.sendTestEmail(body.email);
  }

  // ─── Push Notifications ───────────────────────────────────────────────────

  @Public()
  @Get("push/vapid-key")
  getVapidPublicKey() {
    return { publicKey: this.pushService.getVapidPublicKey() };
  }

  @Post("push/subscribe")
  async subscribePush(
    @Body() body: { endpoint: string; p256dh: string; auth: string },
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    const userAgent = req.headers?.["user-agent"];
    const sub = await this.pushService.saveSubscription(
      { endpoint: body.endpoint, p256dh: body.p256dh, auth: body.auth, userAgent },
      userId,
    );
    return { ok: true, id: sub?.id };
  }

  @Post("push/unsubscribe")
  async unsubscribePush(@Body() body: { endpoint: string }) {
    await this.pushService.removeSubscription(body.endpoint);
    return { ok: true };
  }

  @Post("push/test")
  @Roles("superadmin", "admin")
  async testPush() {
    await this.pushService.sendToAll({
      title: "✅ Тестовый push",
      body: "Push-уведомления работают корректно",
      url: "/crm/",
      tag: "test-push",
    });
    return { ok: true };
  }
}
