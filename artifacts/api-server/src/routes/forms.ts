import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { cheaperPriceReportsTable, feedbackReportsTable } from "@workspace/db";
import { SubmitCheaperPriceBody, SubmitFeedbackBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/forms/cheaper-price", async (req, res): Promise<void> => {
  const parsed = SubmitCheaperPriceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.insert(cheaperPriceReportsTable).values({
    productId: parsed.data.productId ?? null,
    name: parsed.data.name,
    contact: parsed.data.contact,
    competitorUrl: parsed.data.competitorUrl ?? null,
    competitorPrice: parsed.data.competitorPrice != null ? String(parsed.data.competitorPrice) : null,
    comment: parsed.data.comment ?? null,
  });

  res.status(201).json({ status: "ok" });
});

router.post("/forms/feedback", async (req, res): Promise<void> => {
  const parsed = SubmitFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.insert(feedbackReportsTable).values({
    name: parsed.data.name,
    contact: parsed.data.contact,
    message: parsed.data.message,
    pageUrl: parsed.data.pageUrl ?? null,
  });

  res.status(201).json({ status: "ok" });
});

export default router;
