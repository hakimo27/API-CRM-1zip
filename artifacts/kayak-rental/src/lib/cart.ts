export interface CartItem {
  productId: number;
  productName: string;
  productSlug: string;
  quantity: number;
  depositAmount: number | null;
  mainImage: string | null;
}

export interface CartState {
  items: CartItem[];
  startDate: string | null;
  endDate: string | null;
}

const CART_KEY = "kayak_cart";

export function loadCart(): CartState {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return { items: [], startDate: null, endDate: null };
    return JSON.parse(raw) as CartState;
  } catch {
    return { items: [], startDate: null, endDate: null };
  }
}

export function saveCart(cart: CartState): void {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function addToCart(item: CartItem): CartState {
  const cart = loadCart();
  const existing = cart.items.find((i) => i.productId === item.productId);
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cart.items.push(item);
  }
  saveCart(cart);
  return cart;
}

export function removeFromCart(productId: number): CartState {
  const cart = loadCart();
  cart.items = cart.items.filter((i) => i.productId !== productId);
  saveCart(cart);
  return cart;
}

export function updateCartDates(startDate: string, endDate: string): CartState {
  const cart = loadCart();
  cart.startDate = startDate;
  cart.endDate = endDate;
  saveCart(cart);
  return cart;
}

export function clearCart(): CartState {
  const cart: CartState = { items: [], startDate: null, endDate: null };
  saveCart(cart);
  return cart;
}

export function getTotalDeposit(cart: CartState): number {
  return cart.items.reduce((sum, item) => {
    return sum + (item.depositAmount ?? 0) * item.quantity;
  }, 0);
}
