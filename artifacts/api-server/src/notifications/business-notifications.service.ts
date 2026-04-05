import { Injectable, Inject, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DB_TOKEN } from "../database/database.module.js";
import { notificationLogsTable } from "@workspace/db";
import { TelegramService } from "../telegram/telegram.service.js";

type DrizzleDb = typeof import("@workspace/db").db;

@Injectable()
export class BusinessNotificationsService {
  constructor(
    @Inject(DB_TOKEN) private db: DrizzleDb,
    private configService: ConfigService,
    @Optional() private telegramService: TelegramService,
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
  }

  async notifyNewChat(session: {
    id?: number;
    channel?: string;
    metadata?: Record<string, unknown> | null;
  }) {
    const subject = "Новый диалог";
    const ch = session.channel || "web";
    const content =
      `Канал: ${ch}\n` +
      `Сессия ID: ${session.id}\n` +
      (session.metadata?.clientName ? `Клиент: ${session.metadata.clientName}\n` : "");

    await this.log("new_chat", "system", subject, content, "sent");
    await this.sendTelegram(subject, content);
  }

  async notifyNewMessage(session: { id?: number }, message: { content?: string; senderName?: string }) {
    const subject = "Новое сообщение от клиента";
    const content =
      `Сессия ID: ${session.id}\n` +
      `От: ${message.senderName || "Клиент"}\n` +
      `Сообщение: ${(message.content || "").slice(0, 300)}`;

    await this.log("new_message", "system", subject, content, "sent");
    await this.sendTelegram(subject, content);
  }
}
