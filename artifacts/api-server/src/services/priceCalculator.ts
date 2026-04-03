import { db, tariffsTable, productsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

export type PricingResult = {
  exactPrice: number | null;
  approximatePrice: number | null;
  managerReviewRequired: boolean;
  pricingComment: string | null;
  tariffUsed: string | null;
  days: number;
  pricePerDay: number | null;
  depositAmount: number | null;
};

function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  return d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
}

function daysBetween(startStr: string, endStr: string): number {
  const start = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function isMayHolidayPeriod(startStr: string, endStr: string): boolean {
  const start = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  const mayHolidayStart = new Date(`${start.getFullYear()}-04-28T00:00:00`);
  const mayHolidayEnd = new Date(`${start.getFullYear()}-05-12T00:00:00`);
  return start >= mayHolidayStart && end <= mayHolidayEnd;
}

function isWeekendTrip(startStr: string, endStr: string): boolean {
  const startDay = getDayOfWeek(startStr);
  const days = daysBetween(startStr, endStr);
  const isStartWeekend = startDay === 5 || startDay === 6 || startDay === 0;
  return isStartWeekend && days <= 4;
}

function isWeekdayTrip(startStr: string, endStr: string): boolean {
  const startDay = getDayOfWeek(startStr);
  const days = daysBetween(startStr, endStr);
  const isStartWeekday = startDay >= 1 && startDay <= 4;
  return isStartWeekday && days >= 3;
}

function selectTariffType(
  startDate: string,
  endDate: string,
): { tariffType: string; isApproximate: boolean; comment: string | null } {
  const days = daysBetween(startDate, endDate);
  const startDay = getDayOfWeek(startDate);

  if (days <= 0) {
    return { tariffType: "weekend", isApproximate: true, comment: "Минимальный срок аренды — 1 день" };
  }

  if (isMayHolidayPeriod(startDate, endDate)) {
    return { tariffType: "may_holidays", isApproximate: false, comment: "Тариф майские праздники" };
  }

  if (days >= 7) {
    return { tariffType: "week", isApproximate: false, comment: null };
  }

  if (isWeekendTrip(startDate, endDate)) {
    return { tariffType: "weekend", isApproximate: false, comment: null };
  }

  if (startDay === 4) {
    return {
      tariffType: "weekend",
      isApproximate: true,
      comment: "Старт в четверг — тариф может быть как выходной, уточните у менеджера",
    };
  }

  if (startDay === 0 || startDay === 6) {
    return {
      tariffType: "weekend",
      isApproximate: true,
      comment: "Старт в выходной — требует уточнения у менеджера",
    };
  }

  if (isWeekdayTrip(startDate, endDate)) {
    return {
      tariffType: "weekday",
      isApproximate: false,
      comment: days < 3 ? "Будний тариф: минимум 3 дня" : null,
    };
  }

  return {
    tariffType: "weekday",
    isApproximate: true,
    comment: "Нестандартный период — рекомендуется уточнить цену у менеджера",
  };
}

export async function calculatePrice(
  productId: number,
  startDate: string,
  endDate: string,
  quantity: number,
): Promise<PricingResult> {
  const days = daysBetween(startDate, endDate);

  const [product] = await db
    .select({ depositAmount: productsTable.depositAmount })
    .from(productsTable)
    .where(eq(productsTable.id, productId));

  const depositAmount = product?.depositAmount ? parseFloat(product.depositAmount) * quantity : null;

  const { tariffType, isApproximate, comment } = selectTariffType(startDate, endDate);

  const availableTariffs = await db
    .select()
    .from(tariffsTable)
    .where(
      and(eq(tariffsTable.productId, productId), eq(tariffsTable.active, true)),
    );

  let selectedTariff = availableTariffs.find((t) => t.type === tariffType);

  if (!selectedTariff && tariffType === "weekday") {
    selectedTariff = availableTariffs.find((t) => t.type === "week");
  }
  if (!selectedTariff) {
    selectedTariff = availableTariffs.find((t) => t.type === "weekend");
  }
  if (!selectedTariff) {
    selectedTariff = availableTariffs[0];
  }

  if (!selectedTariff) {
    return {
      exactPrice: null,
      approximatePrice: null,
      managerReviewRequired: true,
      pricingComment: "Тарифы не настроены — свяжитесь с менеджером",
      tariffUsed: null,
      days,
      pricePerDay: null,
      depositAmount,
    };
  }

  const minDays = selectedTariff.minDays ?? 1;
  const effectiveDays = Math.max(days, minDays);
  const pricePerDay = parseFloat(selectedTariff.pricePerDay);
  const totalPrice = pricePerDay * effectiveDays * quantity;

  const managerReviewRequired = isApproximate;
  const pricingComment = [
    comment,
    effectiveDays > days
      ? `Применена минималка ${minDays} дней`
      : null,
  ]
    .filter(Boolean)
    .join(". ") || null;

  return {
    exactPrice: managerReviewRequired ? null : totalPrice,
    approximatePrice: managerReviewRequired ? totalPrice : null,
    managerReviewRequired,
    pricingComment,
    tariffUsed: selectedTariff.type,
    days,
    pricePerDay,
    depositAmount,
  };
}
