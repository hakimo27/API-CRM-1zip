import { Controller, Get, Query, UseGuards, Inject } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard.js";
import { DB_TOKEN } from "../database/database.module.js";
import { notificationLogsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

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
}
