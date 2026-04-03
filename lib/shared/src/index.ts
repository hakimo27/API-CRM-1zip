export const USER_ROLES = [
  "superadmin",
  "admin",
  "manager",
  "warehouse",
  "instructor",
  "content_manager",
  "customer",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ORDER_STATUSES = [
  "new",
  "confirmed",
  "paid",
  "in_progress",
  "completed",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const INVENTORY_STATUSES = [
  "available",
  "rented",
  "reserved",
  "maintenance",
  "repair",
  "retired",
  "lost",
] as const;
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

export const TARIFF_TYPES = ["weekday", "weekend", "week", "may_holidays"] as const;
export type TariffType = (typeof TARIFF_TYPES)[number];

export const CHAT_STATUSES = [
  "open",
  "pending",
  "in_progress",
  "resolved",
  "closed",
] as const;
export type ChatStatus = (typeof CHAT_STATUSES)[number];

export const CHAT_CHANNELS = [
  "web",
  "telegram",
  "whatsapp",
  "phone",
  "email",
] as const;
export type ChatChannel = (typeof CHAT_CHANNELS)[number];

export const TOUR_TYPES = [
  "rafting",
  "kayak_tour",
  "instruction",
  "excursion",
] as const;
export type TourType = (typeof TOUR_TYPES)[number];

export const TOUR_DATE_STATUSES = [
  "planned",
  "active",
  "completed",
  "cancelled",
] as const;
export type TourDateStatus = (typeof TOUR_DATE_STATUSES)[number];

export const TOUR_BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
] as const;
export type TourBookingStatus = (typeof TOUR_BOOKING_STATUSES)[number];

export const BRANCH_TYPES = ["main", "satellite", "partner"] as const;
export type BranchType = (typeof BRANCH_TYPES)[number];

export const DIFFICULTY_LEVELS = [1, 2, 3, 4, 5] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export const SALE_ORDER_STATUSES = [
  "new",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export type SaleOrderStatus = (typeof SALE_ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const NOTIFICATION_CHANNELS = ["email", "telegram", "sms"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const PRODUCT_TYPES = ["rental", "sale", "both"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const CATEGORY_SCOPES = [
  "rental",
  "sale",
  "tours",
  "articles",
  "rivers",
  "faq",
] as const;
export type CategoryScope = (typeof CATEGORY_SCOPES)[number];

export const REPAIR_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type RepairStatus = (typeof REPAIR_STATUSES)[number];

export type JwtPayload = {
  sub: number;
  email: string;
  role: UserRole;
  type: "access" | "refresh";
};

export type PricingResult = {
  basePrice: number;
  totalPrice: number;
  days: number;
  tariffType: TariffType;
  deposit: number;
};

export const ORDER_NUMBER_PREFIX = "KR";

export function generateOrderNumber(date: Date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${ORDER_NUMBER_PREFIX}-${yy}${mm}${dd}-${rand}`;
}

export const SETTINGS_GROUPS = [
  "general",
  "contacts",
  "booking",
  "notifications",
  "telegram",
  "payment",
  "seo",
] as const;
export type SettingsGroup = (typeof SETTINGS_GROUPS)[number];
