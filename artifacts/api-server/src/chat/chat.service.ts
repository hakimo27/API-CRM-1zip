import { Injectable, NotFoundException, Inject, Optional } from "@nestjs/common";
import { BusinessNotificationsService } from "../notifications/business-notifications.service.js";
import { eq, desc, and } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import { chatSessionsTable, chatMessagesTable } from "@workspace/db";

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

  async getOrCreateSession(channel: string, externalId?: string, metadata?: Record<string, unknown>) {
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

    const [session] = await this.db
      .insert(chatSessionsTable)
      .values({
        channel: channel as any,
        status: "open",
        metadata: metadata || {},
      })
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

    const [message] = await this.db
      .insert(chatMessagesTable)
      .values({
        sessionId,
        content,
        sender,
        senderName,
      })
      .returning();

    await this.db
      .update(chatSessionsTable)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessionsTable.id, sessionId));

    if (sender === "customer") {
      this.businessNotifications?.notifyNewMessage(
        { id: sessionId },
        { content, senderName },
      ).catch(() => {});
    }

    return message!;
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

  async getUnreadCount() {
    const sessions = await this.db
      .select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.status, "open"));

    return { unread: sessions.length };
  }
}
