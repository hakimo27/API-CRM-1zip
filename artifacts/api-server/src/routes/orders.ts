import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  ordersTable,
  orderItemsTable,
  orderStatusHistoryTable,
  customersTable,
  productsTable,
} from "@workspace/db";
import {
  CreateOrderBody,
  GetOrderParams,
  GetOrderResponse,
} from "@workspace/api-zod";
import { calculatePrice } from "../services/priceCalculator";
import { checkAvailability } from "../services/availability";

const router: IRouter = Router();

function generateOrderNumber(): string {
  const date = new Date();
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `KR-${yy}${mm}${dd}-${rand}`;
}

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const {
    items,
    startDate,
    endDate,
    customerName,
    customerPhone,
    customerEmail,
    communicationChannel,
    deliveryType,
    deliveryAddress,
    comment,
    privacyAccepted,
  } = parsed.data;

  if (!privacyAccepted) {
    res.status(400).json({ error: "Privacy policy must be accepted" });
    return;
  }

  for (const item of items) {
    const avail = await checkAvailability(
      item.productId,
      startDate,
      endDate,
      item.quantity,
    );
    if (!avail.available) {
      const [product] = await db
        .select({ name: productsTable.name })
        .from(productsTable)
        .where(eq(productsTable.id, item.productId));
      res.status(400).json({
        error: `Товар "${product?.name}" недоступен на выбранные даты: ${avail.message}`,
      });
      return;
    }
  }

  let customer = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.phone, customerPhone))
    .then((r) => r[0]);

  if (!customer) {
    [customer] = await db
      .insert(customersTable)
      .values({
        name: customerName,
        phone: customerPhone,
        email: customerEmail ?? null,
        communicationChannel: communicationChannel as any,
      })
      .returning();
  }

  let totalDeposit = 0;
  let managerReviewRequired = false;
  let exactPrice: number | null = 0;
  let approximatePrice: number | null = null;
  let pricingComment: string | null = null;
  let tariffUsed: string | null = null;

  const pricesByItem: Array<{
    productId: number;
    quantity: number;
    depositAmount: number | null;
    lifejacketSizes: string | null;
  }> = [];

  for (const item of items) {
    const pricing = await calculatePrice(
      item.productId,
      startDate,
      endDate,
      item.quantity,
    );

    if (pricing.managerReviewRequired) {
      managerReviewRequired = true;
    }

    if (pricing.managerReviewRequired) {
      if (approximatePrice === null) approximatePrice = 0;
      approximatePrice += pricing.approximatePrice ?? 0;
    } else {
      if (exactPrice !== null) exactPrice += pricing.exactPrice ?? 0;
    }

    if (pricing.depositAmount) totalDeposit += pricing.depositAmount;
    if (pricing.pricingComment && !pricingComment) {
      pricingComment = pricing.pricingComment;
    }
    if (pricing.tariffUsed && !tariffUsed) tariffUsed = pricing.tariffUsed;

    const [prod] = await db
      .select({ depositAmount: productsTable.depositAmount })
      .from(productsTable)
      .where(eq(productsTable.id, item.productId));

    pricesByItem.push({
      productId: item.productId,
      quantity: item.quantity,
      depositAmount: prod?.depositAmount ? parseFloat(prod.depositAmount) : null,
      lifejacketSizes: item.lifejacketSizes ?? null,
    });
  }

  if (managerReviewRequired) {
    exactPrice = null;
  }

  const [order] = await db
    .insert(ordersTable)
    .values({
      orderNumber: generateOrderNumber(),
      customerId: customer.id,
      status: "new",
      startDate,
      endDate,
      deliveryType: deliveryType as any,
      deliveryAddress: deliveryAddress ?? null,
      comment: comment ?? null,
      exactPrice: exactPrice !== null ? String(exactPrice) : null,
      approximatePrice: approximatePrice !== null ? String(approximatePrice) : null,
      managerReviewRequired,
      pricingComment,
      tariffUsed,
      totalDeposit: String(totalDeposit),
      privacyAccepted: true,
    })
    .returning();

  const insertedItems = await db
    .insert(orderItemsTable)
    .values(
      pricesByItem.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        lifejacketSizes: item.lifejacketSizes,
        depositAmount: item.depositAmount !== null ? String(item.depositAmount) : null,
      })),
    )
    .returning();

  await db.insert(orderStatusHistoryTable).values({
    orderId: order.id,
    status: "new",
    comment: "Заказ создан",
  });

  const products = await db
    .select({ id: productsTable.id, name: productsTable.name })
    .from(productsTable)
    .where(
      eq(
        productsTable.id,
        insertedItems[0].productId,
      ),
    );

  const productMap = new Map<number, string>();
  for (const p of products) {
    productMap.set(p.id, p.name);
  }

  const allProducts = await db
    .select({ id: productsTable.id, name: productsTable.name })
    .from(productsTable);
  for (const p of allProducts) {
    productMap.set(p.id, p.name);
  }

  const result = {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    startDate: order.startDate,
    endDate: order.endDate,
    customerName,
    customerPhone,
    deliveryType: order.deliveryType,
    deliveryAddress: order.deliveryAddress ?? null,
    items: insertedItems.map((item) => ({
      productId: item.productId,
      productName: productMap.get(item.productId) ?? "Товар",
      quantity: item.quantity,
      depositAmount: item.depositAmount ? parseFloat(item.depositAmount) : null,
    })),
    exactPrice: order.exactPrice ? parseFloat(order.exactPrice) : null,
    approximatePrice: order.approximatePrice ? parseFloat(order.approximatePrice) : null,
    managerReviewRequired: order.managerReviewRequired,
    pricingComment: order.pricingComment ?? null,
    totalDeposit: order.totalDeposit ? parseFloat(order.totalDeposit) : null,
    createdAt: order.createdAt.toISOString(),
  };

  res.status(201).json(result);
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, id));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const customer = order.customerId
    ? await db
        .select()
        .from(customersTable)
        .where(eq(customersTable.id, order.customerId))
        .then((r) => r[0])
    : null;

  const items = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, order.id));

  const allProducts = await db.select({ id: productsTable.id, name: productsTable.name }).from(productsTable);
  const productMap = new Map(allProducts.map((p) => [p.id, p.name]));

  const result = {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    startDate: order.startDate,
    endDate: order.endDate,
    customerName: customer?.name ?? "Клиент",
    customerPhone: customer?.phone ?? "",
    deliveryType: order.deliveryType,
    deliveryAddress: order.deliveryAddress ?? null,
    items: items.map((item) => ({
      productId: item.productId,
      productName: productMap.get(item.productId) ?? "Товар",
      quantity: item.quantity,
      depositAmount: item.depositAmount ? parseFloat(item.depositAmount) : null,
    })),
    exactPrice: order.exactPrice ? parseFloat(order.exactPrice) : null,
    approximatePrice: order.approximatePrice ? parseFloat(order.approximatePrice) : null,
    managerReviewRequired: order.managerReviewRequired,
    pricingComment: order.pricingComment ?? null,
    totalDeposit: order.totalDeposit ? parseFloat(order.totalDeposit) : null,
    createdAt: order.createdAt.toISOString(),
  };

  res.json(GetOrderResponse.parse(result));
});

export default router;
