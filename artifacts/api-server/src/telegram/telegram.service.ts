import { Injectable, Inject, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DB_TOKEN } from "../database/database.module.js";
import { telegramBindingsTable, chatSessionsTable, chatMessagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type DrizzleDb = typeof import("@workspace/db").db;

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name?: string; username?: string };
    chat: { id: number; type: string };
    text?: string;
    date: number;
  };
}

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly botToken: string;
  private readonly baseUrl: string;
  private pollingActive = false;
  private lastUpdateId = 0;

  constructor(
    @Inject(DB_TOKEN) private db: DrizzleDb,
    private configService: ConfigService
  ) {
    this.botToken = this.configService.get("TELEGRAM_BOT_TOKEN") || "";
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  onModuleInit() {
    if (this.botToken) {
      const webhookUrl = this.configService.get("TELEGRAM_WEBHOOK_URL");
      if (!webhookUrl) {
        this.startPolling();
      }
    }
  }

  async handleWebhook(update: TelegramUpdate) {
    await this.processUpdate(update);
  }

  async sendMessage(chatId: string, text: string, replyMarkup?: unknown) {
    if (!this.botToken) return null;

    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          reply_markup: replyMarkup,
        }),
      });
      return response.json();
    } catch (error) {
      console.error("Telegram sendMessage error:", error);
      return null;
    }
  }

  async setWebhook(url: string) {
    if (!this.botToken) return null;
    const response = await fetch(`${this.baseUrl}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    return response.json();
  }

  async deleteWebhook() {
    if (!this.botToken) return null;
    const response = await fetch(`${this.baseUrl}/deleteWebhook`, { method: "POST" });
    return response.json();
  }

  async getBotInfo() {
    if (!this.botToken) return null;
    const response = await fetch(`${this.baseUrl}/getMe`);
    return response.json();
  }

  private async startPolling() {
    if (this.pollingActive) return;
    this.pollingActive = true;
    console.log("Telegram polling started");

    const poll = async () => {
      if (!this.pollingActive) return;
      try {
        const response = await fetch(
          `${this.baseUrl}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=30&limit=100`
        );
        const data = (await response.json()) as { ok: boolean; result: TelegramUpdate[] };

        if (data.ok && data.result.length > 0) {
          for (const update of data.result) {
            this.lastUpdateId = update.update_id;
            await this.processUpdate(update);
          }
        }
      } catch {
        // silent poll errors
      }
      setTimeout(poll, this.pollingActive ? 1000 : 5000);
    };

    poll();
  }

  private async processUpdate(update: TelegramUpdate) {
    const message = update.message;
    if (!message?.text) return;

    const chatId = String(message.chat.id);
    const text = message.text;
    const senderName = message.from?.first_name || "Telegram";

    if (text === "/start") {
      await this.sendMessage(
        chatId,
        "Привет! Я помогу вам с арендой снаряжения 🛶\n\nНапишите ваш вопрос, и наш менеджер ответит вам."
      );
    }

    let [binding] = await this.db
      .select()
      .from(telegramBindingsTable)
      .where(eq(telegramBindingsTable.telegramChatId, chatId))
      .limit(1);

    if (!binding) {
      let [session] = await this.db
        .insert(chatSessionsTable)
        .values({
          channel: "telegram" as any,
          status: "open",
          telegramChatId: chatId,
          metadata: { telegramUsername: message.from?.username, firstName: senderName },
        })
        .returning();

      [binding] = await this.db
        .insert(telegramBindingsTable)
        .values({
          telegramChatId: chatId,
          telegramUserId: String(message.from?.id),
          telegramUsername: message.from?.username,
          sessionId: session!.id,
          active: true,
        })
        .returning();
    }

    if (binding.sessionId) {
      await this.db.insert(chatMessagesTable).values({
        sessionId: binding.sessionId,
        content: text,
        sender: "customer",
        senderName,
      });

      await this.db
        .update(chatSessionsTable)
        .set({ updatedAt: new Date() })
        .where(eq(chatSessionsTable.id, binding.sessionId));
    }
  }

  async getActiveSessions() {
    return this.db
      .select()
      .from(telegramBindingsTable)
      .where(eq(telegramBindingsTable.active, true));
  }
}
