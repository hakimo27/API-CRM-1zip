import { Router, type IRouter } from "express";
import { CheckAvailabilityBody, CheckAvailabilityResponse } from "@workspace/api-zod";
import { checkAvailability } from "../services/availability";

const router: IRouter = Router();

router.post("/availability/check", async (req, res): Promise<void> => {
  const parsed = CheckAvailabilityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { productId, startDate, endDate, quantity } = parsed.data;
  const result = await checkAvailability(productId, startDate, endDate, quantity);
  res.json(CheckAvailabilityResponse.parse(result));
});

export default router;
