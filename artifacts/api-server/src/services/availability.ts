import { db, reservationsTable, productsTable, ordersTable, orderItemsTable } from "@workspace/db";
import { and, eq, lte, gte } from "drizzle-orm";
import { inArray } from "drizzle-orm";

export type AvailabilityResult = {
  available: boolean;
  availableQuantity: number;
  requestedQuantity: number;
  blockedDates: string[];
  message: string | null;
};

function datesInRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const current = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

const ACTIVE_ORDER_STATUSES = ["confirmed", "paid", "assembled", "issued", "delivered"] as const;

async function getBookedQuantityForPeriod(
  productId: number,
  startDate: string,
  endDate: string,
): Promise<number> {
  const overlappingOrders = await db
    .select({ quantity: orderItemsTable.quantity, orderId: orderItemsTable.orderId })
    .from(orderItemsTable)
    .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
    .where(
      and(
        eq(orderItemsTable.productId, productId),
        inArray(ordersTable.status, [...ACTIVE_ORDER_STATUSES]),
        lte(ordersTable.startDate, endDate),
        gte(ordersTable.endDate, startDate),
      ),
    );

  const manualReservations = await db
    .select({ quantity: reservationsTable.quantity })
    .from(reservationsTable)
    .where(
      and(
        eq(reservationsTable.productId, productId),
        eq(reservationsTable.active, true),
        lte(reservationsTable.startDate, endDate),
        gte(reservationsTable.endDate, startDate),
      ),
    );

  const orderBooked = overlappingOrders.reduce((sum, o) => sum + o.quantity, 0);
  const reservationBooked = manualReservations.reduce((sum, r) => sum + r.quantity, 0);
  return orderBooked + reservationBooked;
}

export async function checkAvailability(
  productId: number,
  startDate: string,
  endDate: string,
  requestedQuantity: number,
): Promise<AvailabilityResult> {
  const [product] = await db
    .select({ totalStock: productsTable.totalStock })
    .from(productsTable)
    .where(eq(productsTable.id, productId));

  if (!product) {
    return {
      available: false,
      availableQuantity: 0,
      requestedQuantity,
      blockedDates: [],
      message: "Товар не найден",
    };
  }

  const totalStock = product.totalStock;
  const bookedQuantity = await getBookedQuantityForPeriod(productId, startDate, endDate);
  const availableQuantity = Math.max(0, totalStock - bookedQuantity);
  const available = availableQuantity >= requestedQuantity;

  const blockedDates: string[] = [];
  if (!available) {
    const allDates = datesInRange(startDate, endDate);
    for (const date of allDates) {
      const dayBooked = await getBookedQuantityForPeriod(productId, date, date);
      if (totalStock - dayBooked < requestedQuantity) {
        blockedDates.push(date);
      }
    }
  }

  return {
    available,
    availableQuantity,
    requestedQuantity,
    blockedDates,
    message: available ? null : `Доступно только ${availableQuantity} единиц на выбранные даты`,
  };
}
