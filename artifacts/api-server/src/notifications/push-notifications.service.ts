import { Injectable, Logger, OnModuleInit, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import webpush from "web-push";
import { DB_TOKEN } from "../database/database.module.js";
import { pushSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type DrizzleDb = typeof import("@workspace/db").db;

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

@Injectable()
export class PushNotificationsService implements OnModuleInit {
  private readonly logger = new Logger(PushNotificationsService.name);
  private enabled = false;

  constructor(
    private config: ConfigService,
    @Inject(DB_TOKEN) private db: DrizzleDb,
  ) {}

  onModuleInit() {
    const publicKey = this.config.get<string>("VAPID_PUBLIC_KEY");
    const privateKey = this.config.get<string>("VAPID_PRIVATE_KEY");
    const subject = this.config.get<string>("VAPID_SUBJECT") || "mailto:admin@baidabaza.ru";

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.enabled = true;
      this.logger.log("Web Push notifications enabled");
    } else {
      this.logger.warn("VAPID keys not configured — push notifications disabled");
    }
  }

  getVapidPublicKey(): string | null {
    return this.config.get<string>("VAPID_PUBLIC_KEY") || null;
  }

  async saveSubscription(
    data: { endpoint: string; p256dh: string; auth: string; userAgent?: string },
    userId?: number,
  ) {
    const existing = await this.db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, data.endpoint));

    if (existing.length > 0) return existing[0]!;

    const [saved] = await this.db
      .insert(pushSubscriptionsTable)
      .values({
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.userAgent,
        userId: userId ?? null,
      })
      .returning();

    this.logger.log(`New push subscription saved (userId: ${userId ?? "anonymous"})`);
    return saved!;
  }

  async removeSubscription(endpoint: string) {
    await this.db
      .delete(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, endpoint));
  }

  async sendToAll(payload: PushPayload): Promise<void> {
    if (!this.enabled) return;

    const subscriptions = await this.db.select().from(pushSubscriptionsTable);
    if (!subscriptions.length) return;

    const payloadStr = JSON.stringify(payload);
    const staleIds: number[] = [];

    await Promise.allSettled(
      subscriptions.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payloadStr,
        ).catch(err => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            staleIds.push(sub.id);
          } else {
            this.logger.warn(`Push failed for sub ${sub.id}: ${err.message}`);
          }
        })
      )
    );

    // Clean up expired subscriptions
    if (staleIds.length > 0) {
      await Promise.all(
        staleIds.map(id =>
          this.db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.id, id))
        )
      );
      this.logger.log(`Cleaned ${staleIds.length} stale push subscriptions`);
    }
  }

  async sendNewChatAlert(sessionId: number, customerName?: string) {
    await this.sendToAll({
      title: "💬 Новый чат",
      body: customerName ? `${customerName} начал чат` : "Новый клиент начал чат",
      url: "/crm/chat",
      tag: `new-chat-${sessionId}`,
    });
  }

  async sendNewMessageAlert(sessionId: number, senderName?: string, preview?: string) {
    await this.sendToAll({
      title: "💬 Новое сообщение",
      body: senderName && preview
        ? `${senderName}: ${preview.slice(0, 80)}`
        : "Клиент написал новое сообщение",
      url: "/crm/chat",
      tag: `chat-msg-${sessionId}`,
    });
  }

  async sendNewOrderAlert(orderNumber: string) {
    await this.sendToAll({
      title: "🛶 Новый заказ аренды",
      body: `Получен заказ ${orderNumber}`,
      url: "/crm/orders",
      tag: `new-order-${orderNumber}`,
    });
  }

  async sendNewSaleOrderAlert(orderId: string | number) {
    await this.sendToAll({
      title: "🛒 Новый заказ продажи",
      body: `Получен заказ на продажу #${orderId}`,
      url: "/crm/sale-orders",
      tag: `new-sale-${orderId}`,
    });
  }

  async sendNewTourBookingAlert(bookingId: string | number, tourName?: string) {
    await this.sendToAll({
      title: "🏕 Новое бронирование тура",
      body: tourName ? `Тур «${tourName}»` : `Бронирование #${bookingId}`,
      url: "/crm/tour-bookings",
      tag: `new-booking-${bookingId}`,
    });
  }
}
