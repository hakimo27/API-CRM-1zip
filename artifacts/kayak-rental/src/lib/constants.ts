export const ORDER_STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  confirmed: "Подтвержден",
  paid: "Оплачен",
  assembled: "Собран",
  issued: "Выдан",
  delivered: "Доставлен",
  completed: "Завершен",
  cancelled: "Отменен",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  confirmed: "bg-indigo-100 text-indigo-800",
  paid: "bg-green-100 text-green-800",
  assembled: "bg-yellow-100 text-yellow-800",
  issued: "bg-orange-100 text-orange-800",
  delivered: "bg-purple-100 text-purple-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

export const DELIVERY_TYPE_LABELS: Record<string, string> = {
  pickup: "Самовывоз",
  delivery: "Доставка",
};

export const COMMUNICATION_CHANNEL_LABELS: Record<string, string> = {
  phone: "Телефон",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  email: "Email",
};

export const INVENTORY_STATUS_LABELS: Record<string, string> = {
  available: "Доступно",
  busy: "Занято",
  reserved: "Забронировано",
  in_repair: "На ремонте",
  incomplete: "Некомплект",
  incoming: "Поступает",
  written_off: "Списано",
};

export const INVENTORY_STATUS_COLORS: Record<string, string> = {
  available: "bg-green-100 text-green-800",
  busy: "bg-orange-100 text-orange-800",
  reserved: "bg-yellow-100 text-yellow-800",
  in_repair: "bg-red-100 text-red-800",
  incomplete: "bg-gray-100 text-gray-800",
  incoming: "bg-blue-100 text-blue-800",
  written_off: "bg-gray-100 text-gray-500",
};

export const CHAT_QUICK_REPLIES = [
  "Хочу подобрать байдарку",
  "Проверить свободные даты",
  "Вопрос по заказу",
  "Доставка",
  "Самовывоз",
  "Помощь менеджера",
];
