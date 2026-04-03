import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { chatSessionsTable, chatMessagesTable } from "@workspace/db";
import {
  AdminListChatSessionsQueryParams,
  AdminListChatSessionsResponse,
  AdminReplyChatSessionParams,
  AdminReplyChatSessionBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/admin/chat-sessions", async (req, res): Promise<void> => {
  const query = AdminListChatSessionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { status } = query.data;
  const condition = status ? eq(chatSessionsTable.status, status as any) : undefined;

  const sessions = await db
    .select()
    .from(chatSessionsTable)
    .where(condition)
    .orderBy(chatSessionsTable.lastMessageAt);

  const sessionIds = sessions.map((s) => s.id);
  const lastMessages =
    sessionIds.length > 0
      ? await db
          .select()
          .from(chatMessagesTable)
          .where(
            eq(chatMessagesTable.sessionId, sessions[sessions.length - 1].id),
          )
      : [];

  const result = sessions.map((s) => ({
    id: s.id,
    sessionToken: s.sessionToken,
    status: s.status,
    customerName: s.customerName ?? null,
    lastMessage: null as string | null,
    unreadCount: s.unreadCount,
    createdAt: s.createdAt.toISOString(),
  }));

  res.json(AdminListChatSessionsResponse.parse(result));
});

router.post(
  "/admin/chat-sessions/:id/reply",
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);

    const body = AdminReplyChatSessionBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const [session] = await db
      .select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.id, id));

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const [message] = await db
      .insert(chatMessagesTable)
      .values({
        sessionId: id,
        sender: "manager",
        content: body.data.content,
        readByManager: true,
      })
      .returning();

    await db
      .update(chatSessionsTable)
      .set({ lastMessageAt: new Date() })
      .where(eq(chatSessionsTable.id, id));

    res.status(201).json({
      id: message.id,
      sessionId: message.sessionId,
      sender: message.sender,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    });
  },
);

export default router;
