import { Injectable, NotFoundException, Inject, Optional } from "@nestjs/common";
import { BusinessNotificationsService } from "../notifications/business-notifications.service.js";
import { eq, desc, and, sql } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import { chatSessionsTable, chatMessagesTable, customersTable } from "@workspace/db";

type DrizzleDb = typeof import("@workspace/db").db;

@Injectable()
export class ChatService {
  constructor(
    @Inject(DB_TOKEN) private db: DrizzleDb,
    @Optional() private businessNotifications: BusinessNotificationsService,
  ) {}

  async getSessions(params: { status?: string; channel?: string; page?: number; limit?: number }) {
    const { status, channel, page = 1, limit = 50 } = params;
    const offset = (page - 1) * limit;

    let sessions = await this.db
      .select()
      .from(chatSessionsTable)
      .orderBy(desc(chatSessionsTable.updatedAt))
      .limit(limit)
      .offset(offset);

    if (status) sessions = sessions.filter((s) => s.status === status);
    if (channel) sessions = sessions.filter((s) => s.channel === channel);

    return sessions;
  }

  async getSession(sessionId: number) {
    const [session] = await this.db
      .select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.id, sessionId))
      .limit(1);

    if (!session) throw new NotFoundException("Сессия не найдена");
    return session;
  }

  async getOrCreateSession(channel: string, externalId?: string, metadata?: Record<string, unknown>, customerName?: string) {
    if (externalId) {
      const [existing] = await this.db
        .select()
        .from(chatSessionsTable)
        .where(
          and(
            eq(chatSessionsTable.channel, channel as any),
            eq(chatSessionsTable.status, "open")
          )
        )
        .limit(1);

      if (existing) return existing;
    }

    const insertValues: any = {
      channel: channel as any,
      status: "open",
      metadata: metadata || {},
    };
    if (customerName) insertValues.customerName = customerName;

    const [session] = await this.db
      .insert(chatSessionsTable)
      .values(insertValues)
      .returning();

    this.businessNotifications?.notifyNewChat({
      id: session!.id,
      channel: session!.channel,
      metadata: session!.metadata as Record<string, unknown> | null,
    }).catch(() => {});

    return session!;
  }

  async getMessages(sessionId: number, limit = 100) {
    const messages = await this.db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.sessionId, sessionId))
      .orderBy(desc(chatMessagesTable.createdAt))
      .limit(limit);

    return messages.reverse();
  }

  async createMessage(sessionId: number, content: string, sender: "customer" | "manager" | "bot", senderName?: string) {
    const [session] = await this.db
      .select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.id, sessionId))
      .limit(1);

    if (!session) throw new NotFoundException("Сессия не найдена");

    const wasReopened = session.status === "closed" && sender === "customer";

    const [message] = await this.db
      .insert(chatMessagesTable)
      .values({ sessionId, content, sender, senderName })
      .returning();

    if (sender === "customer") {
      if (wasReopened) {
        await this.db
          .update(chatSessionsTable)
          .set({ status: "open", unreadCount: 1, updatedAt: new Date(), lastMessageAt: new Date() })
          .where(eq(chatSessionsTable.id, sessionId));
      } else {
        await this.db
          .update(chatSessionsTable)
          .set({
            unreadCount: sql`${chatSessionsTable.unreadCount} + 1`,
            updatedAt: new Date(),
            lastMessageAt: new Date(),
          })
          .where(eq(chatSessionsTable.id, sessionId));
      }
    } else {
      await this.db
        .update(chatSessionsTable)
        .set({ updatedAt: new Date(), lastMessageAt: new Date() })
        .where(eq(chatSessionsTable.id, sessionId));
    }

    if (sender === "customer") {
      this.businessNotifications?.notifyNewMessage(
        { id: sessionId },
        { content, senderName },
      ).catch(() => {});
    }

    if (wasReopened) {
      this.businessNotifications?.notifyNewChat({
        id: sessionId,
        channel: session.channel,
        metadata: session.metadata as Record<string, unknown> | null,
      }).catch(() => {});
    }

    return message!;
  }

  async markAsRead(sessionId: number) {
    const [updated] = await this.db
      .update(chatSessionsTable)
      .set({ unreadCount: 0 })
      .where(eq(chatSessionsTable.id, sessionId))
      .returning();

    if (!updated) throw new NotFoundException("Сессия не найдена");
    return { ok: true };
  }

  async updateSessionStatus(sessionId: number, status: string) {
    const [updated] = await this.db
      .update(chatSessionsTable)
      .set({ status: status as any })
      .where(eq(chatSessionsTable.id, sessionId))
      .returning();

    if (!updated) throw new NotFoundException("Сессия не найдена");
    return updated;
  }

  async createOfflineRequest(data: {
    name?: string;
    phone?: string;
    email?: string;
    message: string;
    sourcePage?: string;
  }) {
    let customer: typeof customersTable.$inferSelect | null = null;

    if (data.phone) {
      const [found] = await this.db
        .select()
        .from(customersTable)
        .where(eq(customersTable.phone, data.phone))
        .limit(1);
      if (found) customer = found;
    }

    if (!customer && data.email) {
      const [found] = await this.db
        .select()
        .from(customersTable)
        .where(eq(customersTable.email, data.email))
        .limit(1);
      if (found) customer = found;
    }

    if (!customer) {
      const [created] = await this.db
        .insert(customersTable)
        .values({
          name: data.name || data.email || data.phone || "Новый клиент",
          phone: data.phone || "",
          email: data.email,
          communicationChannel: "web",
          notes: `Лид из offline-формы. Страница: ${data.sourcePage || "неизвестно"}`,
        })
        .returning();
      customer = created!;
    }

    const [session] = await this.db
      .insert(chatSessionsTable)
      .values({
        channel: "web" as any,
        status: "open" as any,
        customerId: customer!.id,
        customerName: customer!.name,
        metadata: {
          source: "offline_form",
          page: data.sourcePage || null,
          name: data.name,
          phone: data.phone,
          email: data.email,
        },
      })
      .returning();

    await this.db.insert(chatMessagesTable).values({
      sessionId: session!.id,
      content: data.message,
      sender: "customer",
      senderName: data.name || "Клиент",
    });

    this.businessNotifications?.notifyNewChat({
      id: session!.id,
      channel: session!.channel,
      metadata: session!.metadata as Record<string, unknown> | null,
    }).catch(() => {});

    return {
      sessionId: session!.id,
      customerId: customer!.id,
    };
  }

  async getUnreadCount() {
    const sessions = await this.db
      .select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.status, "open"));

    return { unread: sessions.length };
  }
}
