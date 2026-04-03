import { Router, type IRouter } from "express";
import { CalculatePriceBody, CalculatePriceResponse } from "@workspace/api-zod";
import { calculatePrice } from "../services/priceCalculator";

const router: IRouter = Router();

router.post("/pricing/calculate", async (req, res): Promise<void> => {
  const parsed = CalculatePriceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { productId, startDate, endDate, quantity } = parsed.data;
  const result = await calculatePrice(productId, startDate, endDate, quantity);
  res.json(CalculatePriceResponse.parse(result));
});

export default router;
