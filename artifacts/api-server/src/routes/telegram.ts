import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { chatSessionsTable, chatMessagesTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/integrations/telegram/webhook", async (req, res): Promise<void> => {
  const update = req.body;

  if (!update) {
    res.json({ status: "ok" });
    return;
  }

  const message = update.message;
  if (!message) {
    res.json({ status: "ok" });
    return;
  }

  const chatId = String(message.chat?.id);
  const text = message.text ?? "";

  logger.info({ chatId, text }, "Telegram webhook received");

  const [session] = await db
    .select()
    .from(chatSessionsTable)
    .where(eq(chatSessionsTable.telegramChatId, chatId));

  if (session) {
    await db.insert(chatMessagesTable).values({
      sessionId: session.id,
      sender: "manager",
      content: text,
      readByManager: true,
      telegramMessageId: String(message.message_id),
    });

    await db
      .update(chatSessionsTable)
      .set({ lastMessageAt: new Date() })
      .where(eq(chatSessionsTable.id, session.id));
  }

  res.json({ status: "ok" });
});

export default router;
