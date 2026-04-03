import { Router, type IRouter } from "express";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@workspace/db";
import { chatSessionsTable, chatMessagesTable } from "@workspace/db";
import {
  CreateChatSessionBody,
  GetChatMessagesParams,
  GetChatMessagesQueryParams,
  GetChatMessagesResponse,
  SendChatMessageBody,
  SendChatMessageParams,
} from "@workspace/api-zod";
import crypto from "crypto";

const router: IRouter = Router();

router.post("/chat/session", async (req, res): Promise<void> => {
  const parsed = CreateChatSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { customerName, orderId } = parsed.data;
  const sessionToken = crypto.randomUUID();

  const [session] = await db
    .insert(chatSessionsTable)
    .values({
      sessionToken,
      customerName: customerName ?? null,
      orderId: orderId ?? null,
      status: "open",
      unreadCount: 0,
    })
    .returning();

  await db.insert(chatMessagesTable).values({
    sessionId: session.id,
    sender: "bot",
    content:
      "Привет! Я помогу вам с арендой байдарок. Выберите тему или задайте вопрос:",
    readByManager: false,
  });

  res.status(201).json({
    id: session.id,
    sessionToken: session.sessionToken,
    status: session.status,
    customerId: session.customerId ?? null,
    orderId: session.orderId ?? null,
    createdAt: session.createdAt.toISOString(),
  });
});

router.get(
  "/chat/session/:sessionId/messages",
  async (req, res): Promise<void> => {
    const params = GetChatMessagesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const queryParams = GetChatMessagesQueryParams.safeParse(req.query);

    const [session] = await db
      .select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.sessionToken, params.data.sessionId));

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const conditions: any[] = [eq(chatMessagesTable.sessionId, session.id)];
    if (queryParams.success && queryParams.data.since) {
      conditions.push(gt(chatMessagesTable.id, queryParams.data.since));
    }

    const messages = await db
      .select()
      .from(chatMessagesTable)
      .where(and(...conditions))
      .orderBy(chatMessagesTable.createdAt);

    const result = messages.map((m) => ({
      id: m.id,
      sessionId: m.sessionId,
      sender: m.sender,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    }));

    res.json(GetChatMessagesResponse.parse(result));
  },
);

router.post(
  "/chat/session/:sessionId/messages",
  async (req, res): Promise<void> => {
    const params = SendChatMessageParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const body = SendChatMessageBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const [session] = await db
      .select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.sessionToken, params.data.sessionId));

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const [message] = await db
      .insert(chatMessagesTable)
      .values({
        sessionId: session.id,
        sender: "customer",
        content: body.data.content,
        readByManager: false,
      })
      .returning();

    await db
      .update(chatSessionsTable)
      .set({
        unreadCount: (session.unreadCount ?? 0) + 1,
        lastMessageAt: new Date(),
      })
      .where(eq(chatSessionsTable.id, session.id));

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
