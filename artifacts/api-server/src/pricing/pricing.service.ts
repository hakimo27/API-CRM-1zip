import { Injectable, Inject } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import { tariffsTable } from "@workspace/db";
import type { TariffType, PricingResult } from "@workspace/shared";

type DrizzleDb = typeof import("@workspace/db").db;

@Injectable()
export class PricingService {
  constructor(@Inject(DB_TOKEN) private db: DrizzleDb) {}

  getTariffType(startDate: Date, endDate: Date): TariffType {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    if (days >= 7) return "week";

    const month = start.getMonth() + 1;
    const day = start.getDate();
    const isMayHoliday = month === 5 && day >= 1 && day <= 10;
    if (isMayHoliday) return "may_holidays";

    const dayOfWeek = start.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return "weekend";

    return "weekday";
  }

  async calculatePrice(productId: number, startDate: Date, endDate: Date): Promise<PricingResult> {
    const tariffType = this.getTariffType(startDate, endDate);
    const days = Math.max(1, Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    ));

    const tariffs = await this.db
      .select()
      .from(tariffsTable)
      .where(eq(tariffsTable.productId, productId));

    const tariff = tariffs.find((t) => t.tariffType === tariffType)
      || tariffs.find((t) => t.tariffType === "weekday")
      || tariffs[0];

    if (!tariff) {
      return { basePrice: 0, totalPrice: 0, days, tariffType, deposit: 0 };
    }

    const basePrice = parseFloat(tariff.pricePerDay as string);
    const totalPrice = basePrice * days;

    return {
      basePrice,
      totalPrice,
      days,
      tariffType,
      deposit: 0,
    };
  }

  async calculateProductsPrice(
    items: Array<{ productId: number; quantity: number }>,
    startDate: Date,
    endDate: Date
  ) {
    const results = await Promise.all(
      items.map(async ({ productId, quantity }) => {
        const pricing = await this.calculatePrice(productId, startDate, endDate);
        return {
          productId,
          quantity,
          ...pricing,
          totalPrice: pricing.totalPrice * quantity,
        };
      })
    );

    const totalPrice = results.reduce((sum, r) => sum + r.totalPrice, 0);
    return { items: results, totalPrice };
  }
}
