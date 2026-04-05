import { Injectable, Inject, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DB_TOKEN } from "../database/database.module.js";
import { notificationLogsTable } from "@workspace/db";
import { TelegramService } from "../telegram/telegram.service.js";
import { PushNotificationsService } from "./push-notifications.service.js";

type DrizzleDb = typeof import("@workspace/db").db;

@Injectable()
export class BusinessNotificationsService {
  constructor(
    @Inject(DB_TOKEN) private db: DrizzleDb,
    private configService: ConfigService,
    @Optional() private telegramService: TelegramService,
    @Optional() private pushService: PushNotificationsService,
  ) {}

  private get adminChatIds(): string[] {
    const raw = this.configService.get<string>("TELEGRAM_ADMIN_CHAT_ID") || "";
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }

  private async log(
    type: string,
    channel: string,
    subject: string,
    content: string,
    status: "sent" | "failed",
    error?: string,
    orderId?: number,
  ) {
    try {
      await this.db.insert(notificationLogsTable).values({
        type,
        channel,
        subject,
        content,
        status,
        error: error || null,
        sentAt: status === "sent" ? new Date() : null,
        orderId: orderId || null,
      });
    } catch (e) {
      console.error("Failed to write notification log:", e);
    }
  }

  private async sendTelegram(subject: string, content: string) {
    const ids = this.adminChatIds;
    if (!ids.length || !this.telegramService) return;
    for (const chatId of ids) {
      try {
        await this.telegramService.sendMessage(chatId, `<b>${subject}</b>\n\n${content}`);
      } catch (e) {
        console.error(`Telegram send to ${chatId} failed:`, e);
      }
    }
  }

  async notifyNewOrder(order: {
    id?: number;
    orderNumber?: string;
    customerName?: string;
    customerPhone?: string;
    totalAmount?: number | string;
  }) {
    const num = order.orderNumber || `#${order.id}`;
    const subject = `Новый заказ аренды ${num}`;
    const content =
      `Заказ: ${num}\n` +
      `Клиент: ${order.customerName || "—"}\n` +
      `Телефон: ${order.customerPhone || "—"}\n` +
      `Сумма: ${order.totalAmount ? `${Number(order.totalAmount).toLocaleString("ru")} ₽` : "—"}`;

    await this.log("new_rental_order", "system", subject, content, "sent", undefined, order.id);
    await this.sendTelegram(subject, content);
    this.pushService?.sendNewOrderAlert(num).catch(() => {});
  }

  async notifyNewSaleOrder(order: {
    id?: number;
    orderNumber?: string;
    totalAmount?: number | string;
    deliveryAddress?: { name?: string; phone?: string };
  }) {
    const num = order.orderNumber || `#${order.id}`;
    const subject = `Новый заказ магазина ${num}`;
    const addr = order.deliveryAddress;
    const content =
      `Заказ: ${num}\n` +
      `Клиент: ${addr?.name || "—"}\n` +
      `Телефон: ${addr?.phone || "—"}\n` +
      `Сумма: ${order.totalAmount ? `${Number(order.totalAmount).toLocaleString("ru")} ₽` : "—"}`;

    await this.log("new_sale_order", "system", subject, content, "sent", undefined, order.id);
    await this.sendTelegram(subject, content);
    this.pushService?.sendNewSaleOrderAlert(order.id || 0).catch(() => {});
  }

  async notifyNewChat(session: {
    id?: number;
    channel?: string;
    metadata?: Record<string, unknown> | null;
    customerName?: string;
  }) {
    const subject = "Новый диалог";
    const ch = session.channel || "web";
    const customerName = session.customerName || (session.metadata?.clientName as string);
    const content =
      `Канал: ${ch}\n` +
      `Сессия ID: ${session.id}\n` +
      (customerName ? `Клиент: ${customerName}\n` : "");

    await this.log("new_chat", "system", subject, content, "sent");
    await this.sendTelegram(subject, content);
    this.pushService?.sendNewChatAlert(session.id || 0, customerName).catch(() => {});
  }

  async notifyNewMessage(session: { id?: number }, message: { content?: string; senderName?: string }) {
    const subject = "Новое сообщение от клиента";
    const content =
      `Сессия ID: ${session.id}\n` +
      `От: ${message.senderName || "Клиент"}\n` +
      `Сообщение: ${(message.content || "").slice(0, 300)}`;

    await this.log("new_message", "system", subject, content, "sent");
    await this.sendTelegram(subject, content);
    this.pushService?.sendNewMessageAlert(session.id || 0, message.senderName, message.content).catch(() => {});
  }

  async notifyNewTourBooking(booking: {
    id?: number;
    tourName?: string;
    customerName?: string;
    totalAmount?: number | string;
  }) {
    const subject = `Новое бронирование тура`;
    const content =
      `Тур: ${booking.tourName || "—"}\n` +
      `Клиент: ${booking.customerName || "—"}\n` +
      `Сумма: ${booking.totalAmount ? `${Number(booking.totalAmount).toLocaleString("ru")} ₽` : "—"}`;

    await this.log("new_tour_booking", "system", subject, content, "sent");
    await this.sendTelegram(subject, content);
    this.pushService?.sendNewTourBookingAlert(booking.id || 0, booking.tourName).catch(() => {});
  }
}
